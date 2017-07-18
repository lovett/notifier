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
                src: 'public/all.min.css',
                dest: 'public/'
            }
        },

        clean: {
            full: {
                src: ['public']
            },
            app: {
                src: ['public/app*', 'public/all*', 'public/templates']
            }
        },

        copy: {
            app: {
                files: [
                    {
                        expand: true,
                        cwd: 'app/',
                        src: ['**', '!**/*.psd'],
                        dest: 'public/'
                    }
                ]
            },

            lib: {
                files: [
                    {
                        expand: true,
                        flatten: true,
                        src: [
                            'node_modules/angular/angular.js',
                            'node_modules/angular-route/angular-route.js',
                            'node_modules/faye/client/faye-browser.js',
                            'node_modules/faye/client/faye-browser-min.js',
                            'node_modules/faye/client/faye-browser-min.js.map',
                            'node_modules/angular-sanitize/angular-sanitize.js',
                            'node_modules/angular-resource/angular-resource.js',
                            'node_modules/angular-touch/angular-touch.js',
                            'node_modules/angular-animate/angular-animate.js',
                            'node_modules/fastclick/lib/fastclick.js'
                        ],
                        dest: 'public/'
                    }
                ]
            }
        },

        less: {
            main: {
                options: {
                    cleancss: true
                },

                files: {
                    'public/all.min.css': [
                        'node_modules/normalize.css/normalize.css',
                        'node_modules/angular/angular-csp.css',
                        'app/less/*'
                    ]
                }
            }
        },

        ngtemplates: {
            app: {
                cwd: 'app',
                src: 'templates/*.html',
                dest: 'public/js/templates.js',
                options: {
                    module: 'appModule',
                    htmlmin: {
                        collapseWhitespace: true,
                        collapseBooleanAttributes: true,
                        removeAttributeQuotes: true
                    }
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

        uglify: {
            app: {
                options: {
                    sourceMap: true
                },
                files: {
                    'public/app.min.js': [
                        'public/js/app.js',
                        'public/js/controllers.js',
                        'public/js/directives.js',
                        'public/js/filters.js',
                        'public/js/services.js',
                        'public/js/templates.js'
                    ]
                }
            },
            lib: {
                options: {
                    sourceMap: true
                },
                files: {
                    'public/lib.min.js': [
                        'public/angular.js',
                        'public/angular-route.js',
                        'public/faye-browser.js',
                        'public/angular-sanitize.js',
                        'public/angular-resource.js',
                        'public/angular-touch.js',
                        'public/angular-animate.js',
                        'public/fastclick.js'
                    ]
                }
            },
            worker: {
                options: {
                    sourceMap: true
                },
                files: {
                    'public/worker.min.js': [
                        'public/js/worker.js'
                    ]
                }
            }
        },
    });

    grunt.registerTask('build', 'Build the application', (buildType) => {
        let environment, tasks;

        environment = grunt.template.process('<%= nconf.get("NODE_ENV") %>');

        tasks = [];

        if (buildType === 'full') {
            tasks = tasks.concat(['clean:full', 'copy', 'ngtemplates', 'uglify']);
        } else {
            tasks = tasks.concat(['clean:app', 'copy:app', 'ngtemplates', 'uglify:app', 'uglify:worker']);
        }

        tasks = tasks.concat(['less', 'autoprefixer']);

        if (environment !== 'dev') {
            grunt.config.set('uglify.app.options.sourceMap', false);
            grunt.config.set('uglify.lib.options.sourceMap', false);
        }

        grunt.task.run(tasks);

        grunt.file.write('build.txt', new Date());

    });

    grunt.loadNpmTasks('grunt-angular-templates');
    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-uglify');

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
