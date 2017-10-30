#!/usr/bin/env groovy

pipeline {
    agent { node { label 'notifier' } }

    options {
        disableConcurrentBuilds()
    }


    stages {
        stage("Announcement") {
            steps {
                sh "pipeline-notification STARTED SUCCESS"
            }
        }

        stage("Build") {
            steps {
                sh "make build"
            }
        }

        stage("Deploy") {
            steps {
                sh "rm -rf /srv/notifier.old"
                sh "mv /srv/notifier /srv/notifier.old"
                sh "tar -x -f notifier.tar.gz -C /srv"
                sh "sudo systemctl restart notifier"
            }
        }
    }

    post {
        always {
            archive "*.tar.gz"
        }

        success {
            sh "pipeline-notification FINALIZED SUCCESS"
        }

        failure {
            sh "pipeline-notification FINALIZED FAILURE"
        }
    }
}
