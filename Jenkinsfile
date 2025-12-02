pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    credentialsId: 'github-credentials',
                    url: 'https://github.com/OconnerJZ/qscome-server.git'
            }
        }
        
        stage('Test Connection') {
            steps {
                echo '✅ Conexión con GitHub exitosa'
                sh 'ls -la'
            }
        }
    }
}
