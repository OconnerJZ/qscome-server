pipeline {
    agent any

    environment {
        PROJECT_DIR = '/home/bjaramillo/qscome'
        BACKEND_CONTAINER = 'qscome-backend'
        DOCKER_COMPOSE = 'docker compose'
        PUBLIC_API_URL = 'https://api.qscome.com.mx'
        DEPLOYMENT_STARTED = 'false'
        ROLLBACK_IMAGE_ID = ''
        BACKEND_IMAGE_NAME = ''
    }

    stages {
        stage('📥 Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    echo "Commit: ${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        stage('✅ Quality Gate') {
            steps {
                sh '''
            docker run --rm \
                -u "$(id -u):$(id -g)" \
                -e npm_config_cache=/tmp/.npm \
                -v "$WORKSPACE:/app" \
                -w /app \
                node:22 \
                sh -c 'npm ci && npm run quality && npm audit --omit=dev --audit-level=high'
        '''
            }
        }

        stage('💾 Data Backup') {
            steps {
                script {
                    sh "'${WORKSPACE}/scripts/backup-production.sh' '${PROJECT_DIR}' '${BACKEND_CONTAINER}'"
                    if (sh(script: "docker ps -a --format '{{.Names}}' | grep -Fx '${BACKEND_CONTAINER}'", returnStatus: true) == 0) {
                        env.BACKEND_IMAGE_NAME = sh(script: "docker inspect --format='{{.Config.Image}}' '${BACKEND_CONTAINER}'", returnStdout: true).trim()
                        def timestamp = new Date().format('yyyyMMdd_HHmmss')
                        env.ROLLBACK_IMAGE_ID = sh(
                            script: "docker commit '${BACKEND_CONTAINER}' '${BACKEND_CONTAINER}-backup-${timestamp}'",
                            returnStdout: true
                        ).trim()
                        echo "Snapshot de aplicación creado: ${env.ROLLBACK_IMAGE_ID}"
                    } else {
                        echo 'Primer despliegue: no existe una versión anterior de la aplicación.'
                    }
                }
            }
        }

        stage('📝 Update Code') {
            steps {
                sh '''
                    rsync -av --delete \
                        --no-perms --no-owner --no-group \
                        --exclude='.git' --exclude='node_modules' --exclude='.env' \
                        --exclude='dist' --exclude='*.log' --exclude='uploads' \
                        --exclude='private_uploads' --exclude='storage' \
                        "$WORKSPACE/" "$PROJECT_DIR/backend/"
                '''
            }
        }

        stage('🏗️ Build Image') {
            steps {
                sh '''
                    cd "$PROJECT_DIR"
                    $DOCKER_COMPOSE build --no-cache --build-arg APP_VERSION="$GIT_COMMIT_SHORT" backend
                    test -n "$($DOCKER_COMPOSE images -q backend)"
                '''
            }
        }

        stage('🔎 Migration Preflight') {
            steps {
                sh '''
                    cd "$PROJECT_DIR"
                    $DOCKER_COMPOSE run --rm --no-deps backend npm run migration:show:prod
                '''
            }
        }

        stage('🛑 Stop Container') {
            steps {
                script {
                    env.DEPLOYMENT_STARTED = 'true'
                    sh '''
                        cd "$PROJECT_DIR"
                        $DOCKER_COMPOSE stop backend || true
                    '''
                }
            }
        }

        stage('🗄️ Run Migrations') {
            steps {
                sh '''
                    cd "$PROJECT_DIR"
                    $DOCKER_COMPOSE run --rm --no-deps backend npm run migration:run:prod
                '''
            }
        }

        stage('🚀 Deploy') {
            steps {
                sh '''
                    cd "$PROJECT_DIR"
                    $DOCKER_COMPOSE up -d --no-build --force-recreate backend
                '''
            }
        }

        stage('⏳ Wait for Startup') {
            steps {
                timeout(time: 3, unit: 'MINUTES') {
                    sh '''
                        ATTEMPTS=0
                        MAX=36
                        until [ "$(docker inspect --format='{{.State.Health.Status}}' "$BACKEND_CONTAINER" 2>/dev/null || true)" = 'healthy' ]; do
                            if [ "$ATTEMPTS" -ge "$MAX" ]; then
                                docker logs "$BACKEND_CONTAINER" --tail 50
                                exit 1
                            fi
                            ATTEMPTS=$((ATTEMPTS + 1))
                            sleep 5
                        done
                    '''
                }
            }
        }

        stage('🏥 Health Check API') {
            steps {
                retry(3) {
                    sh '''
                        docker exec "$BACKEND_CONTAINER" curl --fail --silent --show-error http://localhost:3000/health > /dev/null
                        curl --fail --silent --show-error --retry 3 --retry-delay 2 "$PUBLIC_API_URL/health" > /dev/null
                    '''
                }
            }
        }

        stage('🖼️ Storage and Proxy Check') {
            steps {
                sh '''
                    MOUNTS=$(docker inspect --format='{{range .Mounts}}{{println .Destination}}{{end}}' "$BACKEND_CONTAINER")
                    printf '%s\n' "$MOUNTS" | grep -Fx '/app/uploads' > /dev/null
                    printf '%s\n' "$MOUNTS" | grep -Fx '/app/private_uploads' > /dev/null

                    PROBE_FILE="deployment-probe-${BUILD_NUMBER}.txt"
                    PROBE_VALUE="qscome-${GIT_COMMIT_SHORT}-${BUILD_NUMBER}"
                    trap 'docker exec "$BACKEND_CONTAINER" rm -f "/app/uploads/$PROBE_FILE" >/dev/null 2>&1 || true' EXIT
                    docker exec "$BACKEND_CONTAINER" sh -c 'printf "%s" "$1" > "/app/uploads/$2"' sh "$PROBE_VALUE" "$PROBE_FILE"

                    INTERNAL_VALUE=$(docker exec "$BACKEND_CONTAINER" curl --fail --silent "http://localhost:3000/uploads/$PROBE_FILE")
                    EXTERNAL_VALUE=$(curl --fail --silent --show-error --retry 3 --retry-delay 2 "$PUBLIC_API_URL/uploads/$PROBE_FILE")
                    test "$INTERNAL_VALUE" = "$PROBE_VALUE"
                    test "$EXTERNAL_VALUE" = "$PROBE_VALUE"
                '''
            }
        }

        stage('🧹 Cleanup') {
            steps {
                sh '''
                    docker image prune -f
                    docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' \
                        | grep "$BACKEND_CONTAINER-backup" | sort -r | tail -n +6 \
                        | awk '{print $2}' | xargs -r docker rmi || true
                '''
            }
        }

        stage('📊 Status') {
            steps {
                sh '''
                    cd "$PROJECT_DIR"
                    $DOCKER_COMPOSE ps
                    docker logs "$BACKEND_CONTAINER" --tail 20
                    docker stats --no-stream "$BACKEND_CONTAINER"
                '''
            }
        }
    }

    post {
        success {
            echo "✅ Despliegue exitoso: ${env.GIT_COMMIT_SHORT}"
            sh '''
                {
                    echo '=== Deploy Exitoso ==='
                    echo "Fecha: $(date)"
                    echo "Commit: $GIT_COMMIT_SHORT"
                    echo "Build: $BUILD_NUMBER"
                    echo '-----------------------------'
                } >> "$PROJECT_DIR/deploy.log"
            '''
        }

        failure {
            echo '❌ DEPLOYMENT FALLÓ'
            script {
                if (env.DEPLOYMENT_STARTED != 'true') {
                    echo 'La versión activa no fue detenida; no se requiere rollback.'
                } else if (!env.ROLLBACK_IMAGE_ID?.trim() || !env.BACKEND_IMAGE_NAME?.trim()) {
                    echo '🚨 No existe una imagen anterior para rollback; se requiere intervención manual.'
                } else {
                    try {
                        sh '''
                            cd "$PROJECT_DIR"
                            $DOCKER_COMPOSE stop backend || true
                            docker tag "$ROLLBACK_IMAGE_ID" "$BACKEND_IMAGE_NAME"
                            $DOCKER_COMPOSE up -d --no-build --force-recreate backend

                            ATTEMPTS=0
                            until docker exec "$BACKEND_CONTAINER" curl --fail --silent http://localhost:3000/health > /dev/null 2>&1; do
                                if [ "$ATTEMPTS" -ge 12 ]; then
                                    docker logs "$BACKEND_CONTAINER" --tail 100
                                    exit 1
                                fi
                                ATTEMPTS=$((ATTEMPTS + 1))
                                sleep 5
                            done
                        '''
                        echo '✅ Rollback de aplicación completado.'
                        echo 'Las migraciones no se revierten automáticamente; usa el respaldo sólo si fuera necesario.'
                    } catch (Exception error) {
                        echo "🚨 Rollback fallido: ${error.message}"
                    }
                }
            }
        }

        always {
            echo "Pipeline finalizado: ${currentBuild.durationString}"
        }
    }
}
