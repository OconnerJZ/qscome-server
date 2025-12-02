pipeline {
    agent any

    environment {
        PROJECT_DIR = '/home/bjaramillo/qscome'
        BACKEND_CONTAINER = 'qscome-backend'
        COMPOSE_FILE = 'docker-compose.yml'
    }

    stages {

        stage('📥 Checkout') {
            steps {
                echo '📥 Descargando código desde GitHub...'
                checkout scm
                
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()
                    echo "Commit: ${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        stage('💾 Backup') {
            steps {
                echo '💾 Creando backup de la versión actual...'
                script {
                    def timestamp = new Date().format('yyyyMMdd_HHmmss')
                    sh """
                        if docker ps -a --format '{{.Names}}' | grep -q '^${BACKEND_CONTAINER}\$'; then
                            echo "Creando backup: ${BACKEND_CONTAINER}-backup-${timestamp}"
                            docker commit ${BACKEND_CONTAINER} ${BACKEND_CONTAINER}-backup-${timestamp}
                            echo "✅ Backup creado"
                        else
                            echo "⚠️ No existe contenedor para respaldar (primer deploy?)"
                        fi
                    """
                }
            }
        }

        stage('📝 Update Code') {
            steps {
                echo '📝 Sincronizando código con el servidor...'
                script {
                    def workspace = env.WORKSPACE
                    sh """
                        rsync -av --delete \
                            --exclude='.git' \
                            --exclude='node_modules' \
                            --exclude='.env' \
                            --exclude='dist' \
                            --exclude='*.log' \
                            --exclude='uploads' \
                            --exclude='storage' \
                            '${workspace}/' '${PROJECT_DIR}/backend/'

                        echo "✅ Código sincronizado"
                    """
                }
            }
        }

        stage('🛑 Stop Container') {
            steps {
                echo '🛑 Deteniendo contenedor actual...'
                sh """
                    cd ${PROJECT_DIR}
                    docker-compose stop backend || true
                    echo "✅ Contenedor detenido"
                """
            }
        }

        stage('🏗️ Build Image') {
            steps {
                echo '🏗️ Construyendo nueva imagen Docker...'
                sh """
                    cd ${PROJECT_DIR}
                    docker-compose build --no-cache backend
                    
                    # Verificar que la imagen se creó
                    if ! docker images | grep -q 'backend'; then
                        echo "❌ La imagen no se construyó correctamente"
                        exit 1
                    fi

                    echo "✅ Imagen construida exitosamente"
                """
            }
        }

        stage('🚀 Deploy') {
            steps {
                echo '🚀 Desplegando nueva versión...'
                sh """
                    cd ${PROJECT_DIR}
                    docker-compose up -d backend
                    echo "✅ Contenedor iniciado"
                """
            }
        }

        stage('⏳ Wait for Startup') {
            steps {
                echo '⏳ Esperando que el contenedor esté healthy...'
                timeout(time: 3, unit: 'MINUTES') {
                    sh """
                        ATTEMPTS=0
                        MAX=36

                        while true; do
                            STATUS=\$(docker inspect --format='{{.State.Health.Status}}' ${BACKEND_CONTAINER} 2>/dev/null || echo "unknown")

                            echo "Intento \$ATTEMPTS/\$MAX - Estado: \$STATUS"

                            if [ "\$STATUS" = "healthy" ]; then
                                echo "✅ Contenedor healthy"
                                break
                            fi
                            
                            if [ \$ATTEMPTS -ge \$MAX ]; then
                                echo "❌ Timeout esperando healthcheck"
                                echo "Logs del contenedor:"
                                docker logs ${BACKEND_CONTAINER} --tail 50
                                exit 1
                            fi
                            
                            ATTEMPTS=\$((ATTEMPTS+1))
                            sleep 5
                        done
                    """
                }
            }
        }

        stage('🏥 Health Check API') {
            steps {
                echo '🏥 Verificando endpoint de la API...'
                retry(3) {
                    sh """
                        sleep 3
                        # Probar endpoint principal
                        docker exec ${BACKEND_CONTAINER} wget -qO- http://localhost:3000/ > /dev/null || exit 1
                        echo "✅ API respondiendo correctamente"
                    """
                }
            }
        }

        stage('🧹 Cleanup') {
            steps {
                echo '🧹 Limpiando recursos antiguos...'
                sh """
                    # Limpiar imágenes dangling
                    docker image prune -f

                    echo "Eliminando backups antiguos (manteniendo últimos 5)..."
                    docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' \
                        | grep '${BACKEND_CONTAINER}-backup' \
                        | sort -r \
                        | tail -n +6 \
                        | awk '{print \$2}' \
                        | xargs -r docker rmi || echo "No hay backups antiguos"

                    echo "✅ Limpieza completada"
                """
            }
        }

        stage('📊 Status') {
            steps {
                echo '📊 Estado final del deployment:'
                sh """
                    cd ${PROJECT_DIR}
                    echo "=== Contenedores ==="
                    docker-compose ps
                    
                    echo ""
                    echo "=== Últimos logs ==="
                    docker logs ${BACKEND_CONTAINER} --tail 20
                    
                    echo ""
                    echo "=== Uso de recursos ==="
                    docker stats --no-stream ${BACKEND_CONTAINER}
                """
            }
        }
    }

    post {
        success {
            echo '✅ ¡Despliegue exitoso! 🎉'
            echo "Versión desplegada: ${env.GIT_COMMIT_SHORT}"
            echo "Servicio: https://api.qscome.com.mx"

            sh """
                echo "=== Deploy Exitoso ===" >> ${PROJECT_DIR}/deploy.log
                echo "Fecha: \$(date)" >> ${PROJECT_DIR}/deploy.log
                echo "Commit: ${env.GIT_COMMIT_SHORT}" >> ${PROJECT_DIR}/deploy.log
                echo "Build: ${env.BUILD_NUMBER}" >> ${PROJECT_DIR}/deploy.log
                echo "-----------------------------" >> ${PROJECT_DIR}/deploy.log
            """
        }

        failure {
            echo '❌ DEPLOYMENT FALLÓ'
            echo '🔄 Iniciando rollback automático...'

            script {
                try {
                    sh """
                        cd ${PROJECT_DIR}
                        
                        # Buscar último backup disponible
                        LAST_BACKUP=\$(docker images --format '{{.Repository}}:{{.Tag}}' \
                            | grep '${BACKEND_CONTAINER}-backup' \
                            | sort -r \
                            | head -1)

                        if [ -z "\$LAST_BACKUP" ]; then
                            echo "❌ No hay backups disponibles"
                            echo "=== Logs del contenedor fallido ==="
                            docker logs ${BACKEND_CONTAINER} --tail 100
                            exit 1
                        fi

                        echo "📦 Restaurando desde: \$LAST_BACKUP"
                        
                        # Detener contenedor fallido
                        docker-compose stop backend
                        
                        # Obtener nombre de imagen que usa docker-compose
                        IMAGE_NAME=\$(docker-compose config | grep 'image:' | grep backend | awk '{print \$2}')
                        
                        # Si no hay imagen definida, docker-compose usa: directorio_servicio
                        if [ -z "\$IMAGE_NAME" ]; then
                            IMAGE_NAME="qscome_backend"
                        fi
                        
                        echo "Retagging \$LAST_BACKUP como \$IMAGE_NAME:latest"
                        docker tag \$LAST_BACKUP \$IMAGE_NAME:latest
                        
                        # Levantar con el backup
                        docker-compose up -d backend

                        echo "⏳ Esperando validación del rollback (15 segundos)..."
                        sleep 15

                        # Verificar que el rollback funcionó
                        if docker exec ${BACKEND_CONTAINER} wget -qO- http://localhost:3000/ > /dev/null 2>&1 ; then
                            echo "✅ Rollback exitoso - versión anterior restaurada"
                        else
                            echo "❌ Rollback falló"
                            echo "=== Logs después del rollback ==="
                            docker logs ${BACKEND_CONTAINER} --tail 50
                            echo "⚠️ REQUIERE INTERVENCIÓN MANUAL"
                            exit 1
                        fi
                    """
                } catch (Exception e) {
                    echo "❌ Error crítico durante rollback: ${e.message}"
                    echo "🚨 REQUIERE INTERVENCIÓN MANUAL INMEDIATA"
                    sh "docker logs ${BACKEND_CONTAINER} --tail 100 || true"
                }
            }
        }

        always {
            echo '📝 Pipeline finalizado'
            echo "Duración: ${currentBuild.durationString}"
        }
    }
}
