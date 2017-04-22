var nconf = require('nconf');
module.exports = function(grunt) {
    nconf.env();

    if (process.env.NODE_ENV) {
        nconf.file('local', 'config-' + process.env.NODE_ENV + '.json');
    }

    grunt.initConfig({
        nconf: nconf,
        appcache: {
            options: {
                basePath: 'public'
            },
            all: {
                dest: 'public/notifier.appcache',
                cache: {
                    patterns: [
                        'public/*.min.js',
                        'public/*.min.css',
                        'public/favicon/app-icon*.png',
                        'public/favicon/favicon.ico',
                        'public/favicon/favicon.png',
                    ]
                },
                network: '*'
            }
        },

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
            },
            postBuild: {
                src: ['public/version.json']
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



        replace: {
            websocket: {
                src: ['public/index.html'],
                overwrite: true,
                replacements: [{
                    from: '<meta name=\"websocket port\" content=\"\"',
                    to: '<meta name=\"websocket port\" content=\"<%= nconf.get("NOTIFIER_WEBSOCKET_PORT") %>\"'
                }]
            },
            development: {
                src: ['public/index.html'],
                overwrite: true,
                replacements: [{
                    from: '<!-- livereload placeholder -->',
                    to: '<script src=\'//<%= nconf.get("NOTIFIER_LIVERELOAD_HOST") %>:<%= nconf.get("NOTIFIER_LIVERELOAD_PORT") %>/livereload.js\'></script>'
                }, {
                    from: '<!-- environment name placeholder -->',
                    to: '<%= nconf.get("NODE_ENV") %>'
                }]
            },
            production: {
                src: ['public/index.html'],
                overwrite: true,
                replacements: [{
                    from: '<!-- livereload placeholder -->',
                    to: ''
                }, {
                    from: '<!-- environment name placeholder -->',
                    to: ''
                }]
            }
        },

        shell: {
            'favicon': {
                command: [
                    'cd app/favicon',
                    'convert app-icon.png -geometry 180x180 app-icon-180.png',
                    'convert favicon.png -geometry 48x48 -transparent white temp-48.png',
                    'convert favicon.png -geometry 32x32 -transparent white temp-32.png',
                    'convert favicon.png -geometry 16x16 -transparent white temp-16.png',
                    'optipng -quiet -o 3 app-icon-*.png',
                    'advdef -q -z -4 -i 5 app-icon-*.png',
                    'convert temp-16.png temp-32.png temp-48.png favicon.ico',
                    'rm temp-*.png'
                ].join(' && ')
            },
            'migration': {
                command: function (undo) {
                    var action = 'db:migrate';
                    if (undo) {
                        action += ':undo';
                    }
                    return './node_modules/.bin/sequelize ' + action + ' --env default --config migration-config.json --migrations-path server/migrations';
                }
            }
        },

        watch: {
            options: {
                livereload: {
                    host: '<%= nconf.get("NOTIFIER_LIVERELOAD_HOST") %>',
                    port: '<%= nconf.get("NOTIFIER_LIVERELOAD_PORT") %>'
                }
            },
            app: {
                files: ['app/**', 'Gruntfile.js', '!app/**/.*', '!app/**/flycheck_*'],
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
            }

        },

    });

    grunt.registerTask('build', 'Build the application', function (buildType) {
        var environment, tasks;

        environment = grunt.template.process('<%= nconf.get("NODE_ENV") %>');

        tasks = [];

        if (buildType === 'full') {
            tasks = tasks.concat(['clean:full', 'copy', 'ngtemplates', 'uglify']);
        } else {
            tasks = tasks.concat(['clean:app', 'copy:app', 'ngtemplates', 'uglify:app']);
        }

        tasks = tasks.concat(['less', 'autoprefixer', 'replace:websocket']);

        if (environment === 'development') {
            tasks = tasks.concat('replace:development');
        } else {
            grunt.config.set('uglify.app.options.sourceMap', false);
            grunt.config.set('uglify.lib.options.sourceMap', false);
            tasks = tasks.concat('replace:production');
        }

        tasks = tasks.concat(['clean:postBuild', 'appcache']);

        grunt.task.run(tasks);
    });

    grunt.registerTask('migrate', function (undo) {
        var configPath, dbEnv, env, migrationConfig, shellTask;

        env = grunt.file.readJSON('config.json');
        configPath = 'migration-config.json';
        dbEnv = env.NOTIFIER_DB_CONFIG[env.NOTIFIER_DB];

        if (process.env.NOTIFIER_DB_USER) {
            dbEnv.username = process.env.NOTIFIER_DB_USER;
        }

        if (process.env.NOTIFIER_DB_PASS) {
            dbEnv.password = process.env.NOTIFIER_DB_PASS;
        }

        if (process.env.NOTIFIER_DB_NAME) {
            dbEnv.dbname = process.env.NOTIFIER_DB_NAME;
        }

        migrationConfig = {
            'default': {
                'username': dbEnv.username,
                'password': dbEnv.password,
                'database': dbEnv.dbname,
                'dialect': dbEnv.sequelize.dialect,
                'host': dbEnv.sequelize.host
            }
        };

        if (dbEnv.sequelize.hasOwnProperty('storage')) {
            migrationConfig.default.storage = dbEnv.sequelize.storage;
        }

        grunt.file.write(configPath, JSON.stringify(migrationConfig));

        shellTask = 'shell:migration' ;

        if (undo === 'undo') {
            shellTask += ':undo';
        }

        grunt.task.run(shellTask);
    });

    grunt.loadNpmTasks('grunt-angular-templates');
    grunt.loadNpmTasks('grunt-appcache');
    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-text-replace');

    if (process.env.NODE_ENV === 'development') {
        grunt.loadNpmTasks('grunt-contrib-watch');
        grunt.registerTask('default', ['build:full', 'watch']);
    } else {
        grunt.registerTask('default', function () {
            grunt.log.error('There is no default task unless NODE_ENV is set to development.');
        });
    }
};
