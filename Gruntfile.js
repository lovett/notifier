'use strict';

let nconf = require('nconf');

module.exports = function(grunt) {
    nconf.env();

    if (process.env.NODE_ENV) {
        nconf.file('local', 'config-' + process.env.NODE_ENV + '.json');
    }

    nconf.defaults({
        'NOTIFIER_BASE_URL': '/'
    });

    grunt.initConfig({
        nconf: nconf,

        autoprefixer: {
            app: {
                expand: true,
                flatten: true,
                src: 'public/app/app.min.css',
                dest: 'public/app'
            }
        },

        clean: {
            full: {
                src: ['public']
            },
            app: {
                src: ['public/app*', 'public/all*']
            }
        },

        copy: {
            svg: {
                files: [
                    {
                        expand: true,
                        flatten: true,
                        src: [
                            'app/svg/*.svg',
                        ],
                        dest: 'public/app/svg'
                    }
                ]
            }
        },

        less: {
            app: {
                options: {
                    cleancss: true
                },

                files: {
                    'public/app.min.css': [
                        'node_modules/normalize.css/normalize.css',
                        'node_modules/angular/angular-csp.css',
                        'app/less/*'
                    ]
                }
            }
        },

        watch: {
            options: {
                livereload: {
                    host: nconf.get('NOTIFIER_LIVERELOAD_HOST'),
                    port: nconf.get('NOTIFIER_LIVERELOAD_PORT')
                }
            },

            app: {
                files: ['app/**', 'Gruntfile.js', '!app/**/.*', 'views/*.ejs', '!app/**/flycheck_*'],
                tasks: ['build']
            }
        },
    });

    grunt.registerTask('build', 'Build the application', () => {
        let tasks;

        tasks = ['less:app', 'autoprefixer:app'];

        grunt.task.run(tasks);

        grunt.file.write('build.txt', new Date());

    });

    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-less');

    if (process.env.NODE_ENV === 'dev') {
        grunt.loadNpmTasks('grunt-contrib-watch');
        grunt.registerTask('default', ['build:full', 'watch']);

        return;
    }

    grunt.registerTask(
        'default',
        () => grunt.log.error('There is no default task unless NODE_ENV is set to dev.')
    );
};
