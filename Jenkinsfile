#!/usr/bin/env groovy

pipeline {
    agent any

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
                ansiblePlaybook(
                    playbook: "ansible/install.yml",
                    credentialsId: "f4f6a0a8-c2ae-4f7e-9bf1-869831034fad",
                    limit: "notifier"
                )
            }
        }
    }

    post {
        always {
            archiveArtifacts "*.tar.gz"
        }

        success {
            sh "pipeline-notification FINALIZED SUCCESS"
        }

        failure {
            sh "pipeline-notification FINALIZED FAILURE"
        }
    }
}
