pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        PROJECT_DIR = '/home/bjaramillo/qscome'
        BACKEND_CONTAINER = 'qscome-backend'
        DOCKER_COMPOSE = 'docker compose'
        PUBLIC_API_URL = 'https://api.qscome.com.mx'
        DEPLOYMENT_STARTED = 'false'
        ROLLBACK_IMAGE_NAME = ''
        BACKEND_IMAGE_NAME = ''
    }

    stages {
        stage('📥 Checkout') {
            steps {
                deleteDir()
                checkout scm

                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()

                    echo "Commit: ${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        stage('🔎 Deployment Preflight') {
            steps {
                sh '''
                    command -v docker > /dev/null
                    command -v rsync > /dev/null
                    command -v curl > /dev/null
                    $DOCKER_COMPOSE version > /dev/null

                    test -d "$PROJECT_DIR"
                    test -d "$PROJECT_DIR/backend"
                    test -f "$PROJECT_DIR/docker-compose.yml" \
                        || test -f "$PROJECT_DIR/compose.yml"

                    cd "$PROJECT_DIR"
                    $DOCKER_COMPOSE config --quiet
                '''
            }
        }

        stage('✅ Quality Gate') {
            steps {
                sh '''
            docker run --rm \
                -e HOME=/tmp \
                -e npm_config_cache=/tmp/.npm \
                -v "$WORKSPACE:/app:ro" \
                -v /app/node_modules \
                -v /app/dist \
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

                    def containerExists = sh(
                        script: "docker ps -a --format '{{.Names}}' | grep -Fx '${BACKEND_CONTAINER}'",
                        returnStatus: true
                    ) == 0

                    if (containerExists) {
                        env.BACKEND_IMAGE_NAME = sh(
                            script: "docker inspect --format='{{.Config.Image}}' '${BACKEND_CONTAINER}'",
                            returnStdout: true
                        ).trim()

                        env.ROLLBACK_IMAGE_NAME =
                            "${env.BACKEND_CONTAINER}-rollback:${env.BUILD_NUMBER}"

                        env.CURRENT_IMAGE_ID = sh(
                            script: "docker inspect --format='{{.Image}}' '${BACKEND_CONTAINER}'",
                            returnStdout: true
                        ).trim()

                        def currentImageExists = sh(
                            script: "docker image inspect '${env.CURRENT_IMAGE_ID}' > /dev/null 2>&1",
                            returnStatus: true
                        ) == 0

                        if (!currentImageExists) {
                            echo 'La imagen del contenedor activo no está disponible; se reconstruirá desde el código desplegado antes de actualizarlo.'

                            sh '''
                                cd "$PROJECT_DIR"
                                $DOCKER_COMPOSE build --no-cache backend
                                docker image inspect "$BACKEND_IMAGE_NAME" > /dev/null
                            '''

                            env.CURRENT_IMAGE_ID = sh(
                                script: "docker image inspect --format='{{.Id}}' '${env.BACKEND_IMAGE_NAME}'",
                                returnStdout: true
                            ).trim()
                        }

                        sh "docker tag '${env.CURRENT_IMAGE_ID}' '${env.ROLLBACK_IMAGE_NAME}'"
                        echo "Imagen de rollback preparada: ${env.ROLLBACK_IMAGE_NAME}"
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
                        --no-perms \
                        --no-owner \
                        --no-group \
                        --exclude='.git' \
                        --exclude='node_modules' \
                        --exclude='.env' \
                        --exclude='dist' \
                        --exclude='*.log' \
                        --exclude='uploads' \
                        --exclude='private_uploads' \
                        --exclude='storage' \
                        "$WORKSPACE/" \
                        "$PROJECT_DIR/backend/"
                '''
            }
        }

        stage('🏗️ Build Image') {
            steps {
                sh '''
                    cd "$PROJECT_DIR"

                    $DOCKER_COMPOSE build \
                        --no-cache \
                        --build-arg APP_VERSION="$GIT_COMMIT_SHORT" \
                        backend
                '''
            }
        }

        stage('🔎 Migration Preflight') {
            steps {
                sh '''
                    cd "$PROJECT_DIR"

                    $DOCKER_COMPOSE run \
                        --rm \
                        --no-deps \
                        backend \
                        npm run migration:show:prod
                '''
            }
        }

        stage('🛑 Stop Container') {
            steps {
                script {
                    env.DEPLOYMENT_STARTED = 'true'

                    sh '''
                        cd "$PROJECT_DIR"

                        if [ -n "$($DOCKER_COMPOSE ps -q backend)" ]; then
                            $DOCKER_COMPOSE stop backend
                        fi
                    '''
                }
            }
        }

        stage('🗄️ Run Migrations') {
            steps {
                sh '''
                    cd "$PROJECT_DIR"

                    $DOCKER_COMPOSE run \
                        --rm \
                        --no-deps \
                        backend \
                        npm run migration:run:prod
                '''
            }
        }

        stage('🚀 Deploy') {
            steps {
                sh '''
                    cd "$PROJECT_DIR"

                    $DOCKER_COMPOSE up \
                        -d \
                        --no-build \
                        --force-recreate \
                        backend
                '''
            }
        }

        stage('⏳ Wait for Startup') {
            steps {
                timeout(time: 3, unit: 'MINUTES') {
                    sh '''
                        ATTEMPTS=0
                        MAX_ATTEMPTS=36

                        until [ "$(docker inspect --format='{{.State.Health.Status}}' "$BACKEND_CONTAINER" 2>/dev/null || true)" = 'healthy' ]; do
                            if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
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
                        docker exec "$BACKEND_CONTAINER" \
                            curl --fail --silent --show-error \
                            http://localhost:3000/health \
                            > /dev/null

                        curl --fail \
                            --silent \
                            --show-error \
                            --retry 3 \
                            --retry-delay 2 \
                            "$PUBLIC_API_URL/health" \
                            > /dev/null
                    '''
                }
            }
        }

        stage('🖼️ Storage and Proxy Check') {
            steps {
                sh '''
                    MOUNTS=$(docker inspect \
                        --format='{{range .Mounts}}{{println .Destination}}{{end}}' \
                        "$BACKEND_CONTAINER")

                    printf '%s\n' "$MOUNTS" \
                        | grep -Fx '/app/uploads' \
                        > /dev/null

                    printf '%s\n' "$MOUNTS" \
                        | grep -Fx '/app/private_uploads' \
                        > /dev/null

                    PROBE_FILE="deployment-probe-${BUILD_NUMBER}.txt"
                    PROBE_VALUE="qscome-${GIT_COMMIT_SHORT}-${BUILD_NUMBER}"

                    trap 'docker exec "$BACKEND_CONTAINER" rm -f "/app/uploads/$PROBE_FILE" >/dev/null 2>&1 || true' EXIT

                    docker exec "$BACKEND_CONTAINER" \
                        sh -c 'printf "%s" "$1" > "/app/uploads/$2"' \
                        sh \
                        "$PROBE_VALUE" \
                        "$PROBE_FILE"

                    INTERNAL_VALUE=$(docker exec "$BACKEND_CONTAINER" \
                        curl --fail --silent \
                        "http://localhost:3000/uploads/$PROBE_FILE")

                    EXTERNAL_VALUE=$(curl \
                        --fail \
                        --silent \
                        --show-error \
                        --retry 3 \
                        --retry-delay 2 \
                        "$PUBLIC_API_URL/uploads/$PROBE_FILE")

                    test "$INTERNAL_VALUE" = "$PROBE_VALUE"
                    test "$EXTERNAL_VALUE" = "$PROBE_VALUE"
                '''
            }
        }

        stage('🧹 Cleanup') {
            steps {
                sh '''
                    docker image prune -f || true

                    docker images \
                        --format '{{.Repository}}:{{.Tag}} {{.ID}}' \
                        | awk -v prefix="$BACKEND_CONTAINER-rollback:" \
                            'index($1, prefix) == 1 { print }' \
                        | sort -t: -k2,2nr \
                        | tail -n +6 \
                        | awk '{print $2}' \
                        | xargs -r docker rmi \
                        || true
                '''
            }
        }

        stage('📊 Status') {
            steps {
                sh '''
                    cd "$PROJECT_DIR"

                    $DOCKER_COMPOSE ps
                    docker logs "$BACKEND_CONTAINER" --tail 20 || true
                    docker stats --no-stream "$BACKEND_CONTAINER" || true
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
                } else if (
                    !env.ROLLBACK_IMAGE_NAME?.trim()
                    || !env.BACKEND_IMAGE_NAME?.trim()
                ) {
                    echo '🚨 No existe una imagen anterior para rollback; se requiere intervención manual.'
                } else {
                    try {
                        sh '''
                            cd "$PROJECT_DIR"

                            $DOCKER_COMPOSE stop backend || true

                            docker image inspect \
                                "$ROLLBACK_IMAGE_NAME" \
                                > /dev/null

                            docker tag \
                                "$ROLLBACK_IMAGE_NAME" \
                                "$BACKEND_IMAGE_NAME"

                            $DOCKER_COMPOSE up \
                                -d \
                                --no-build \
                                --force-recreate \
                                backend

                            ATTEMPTS=0
                            MAX_ATTEMPTS=12

                            until docker exec "$BACKEND_CONTAINER" \
                                curl --fail --silent \
                                http://localhost:3000/health \
                                > /dev/null 2>&1
                            do
                                if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
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
