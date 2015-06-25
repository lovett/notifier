var touch = require('touch');

module.exports = function(grunt) {

    var tokenFile = '.token',
        env = grunt.file.readJSON('env.json');

    grunt.initConfig({
        env: env,

        appcache: {
            options: {
                basePath: 'static'
            },
            all: {
                dest: 'static/notifier.appcache',
                cache: {
                    patterns: [
                        'static/*.min.js',
                        'static/*.min.css',
                        'static/views/*.html',
                        'static/favicon/app-icon*.png',
                        'static/favicon/favicon.ico',
                        'static/favicon/favicon.png',
                    ]
                },
                network: '*'
            }
        },

        autoprefixer: {
            app: {
                expand: true,
                flatten: true,
                src: 'static/all.min.css',
                dest: 'static/'
            }
        },

        token: (function () {
            try {
                return grunt.file.readJSON(tokenFile);
            } catch (e) {
            }
        }()),

        clean: {
            full: {
                src: ['static']
            },
            app: {
                src: ['static/app*', 'static/all*']
            },
            postBuild: {
                src: ['static/version.json']
            }
        },

        copy: {
            app: {
                files: [
                    {
                        expand: true,
                        cwd: 'app/',
                        src: ['**', '!**/*.psd'],
                        dest: 'static/'
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
                            'node_modules/faye/browser/faye-browser.js',
                            'node_modules/angular-sanitize/angular-sanitize.js',
                            'node_modules/angular-resource/angular-resource.js',
                            'node_modules/angular-touch/angular-touch.js',
                            'node_modules/angular-animate/angular-animate.js',
                        ],
                        dest: 'static/'
                    }
                ]
            }
        },

        githooks: {
            all: {
                'pre-commit': 'lesslint jshint'
            }
        },

        http: {
            authtoken: {
                options: {
                    url: 'http://localhost:<%= env.NOTIFIER_HTTP_PORT %>/auth',
                    headers: {
                        'Accept': 'application/json'
                    },
                    method: 'POST',
                    form: {
                        username: '<%= env.NOTIFIER_DEFAULT_USER %>',
                        password: '<%= env.NOTIFIER_DEFAULT_PASSWORD %>',
                        persist: 1,
                        label: 'grunt',
                    },
                    callback: function (error, response, body) {
                        grunt.file.write(tokenFile, body);
                    }
                }
            },
            onemessage: {
                options: {
                    url: 'http://localhost:<%= env.NOTIFIER_HTTP_PORT %>/message',
                    method: 'POST',
                    auth: {
                        user: '<%= token.key %>',
                        pass: '<%= token.value %>'
                    },
                    form: {
                        title: 'Test message',
                        body: new Date().getTime(),
                        group: grunt.option('group') || 'test',
                        url: grunt.option('url') || 'http://example.com',
                        localId: 'test',
                        pushbulletId: 0
                    }
                }
            },

            retract: {
                options: {
                    url: 'http://localhost:<%= env.NOTIFIER_HTTP_PORT %>/message/clear',
                    method: 'POST',
                    auth: {
                        user: '<%= token.key %>',
                        pass: '<%= token.value %>'
                    },
                    form: {
                        localId: 'test'
                    }
                }
            },
            archive: {
                options: {
                    url: 'http://localhost:<%= env.NOTIFIER_HTTP_PORT %>/archive/10',
                    method: 'GET',
                    headers: {
                        'x-token': '<%= token.token %>'
                    },
                    callback: function (error, response, body) {
                        console.dir(JSON.parse(body, undefined, 2));
                    }
                }
            }
        },

        karma: {
            unit: {
                configFile: 'app/test/karma.conf.js'
            }
        },

        jshint: {
            node: {
                options: {
                    jshintrc: '.jshintrc-node'
                },
                src: ['server/notifier-server.js', 'Gruntfile.js', 'clients/*.js']
            },

            mocha: {
                options: {
                    jshintrc: '.jshintrc-node'
                },
                src: ['server/test/*-spec.js']
            },

            browser: {
                options: {
                    jshintrc: '.jshintrc-browser'
                },
                src: ['app/js/*.js']
            }
        },

        less: {
            main: {
                options: {
                    cleancss: true
                },
                files: {
                    'static/all.min.css': ['node_modules/normalize.css/normalize.css',
                                           'node_modules/angular/angular-csp.css',
                                           'app/less/*']
                }
            }
        },

        lesslint: {
            src: ['app/less/*.less'],
            options: {
                csslint: {
                    'known-properties': false,
                    'gradients': false,
                    'adjoining-classes': false
                }
            }
        },

        mochaTest: {
            server: {
                options: {
                    reporter: 'spec',
                    bail: true,
                    require: 'server/test/world.js'
                },
                src: ['server/test/*-spec.js']
            }
        },

        'mocha_istanbul': {
            server: {
                src: 'server/test',
                options: {
                    mask: '*-spec.js',
                    require: ['server/test/world.js'],
                    coverageFolder: 'coverage/server'
                }
            }
        },

        open : {
            'coverageServer': {
                path: 'coverage/server/lcov-report/index.html'
            },
            'coverageAppUnit': {
                path: 'coverage/firefox-unit/lcov-report/index.html'
            }
        },

        replace: {
            websocket: {
                src: ['static/views/index.html'],
                overwrite: true,
                replacements: [{
                    from: '<meta name=\"websocket port\" content=\"\"',
                    to: '<meta name=\"websocket port\" content=\"<%= env.NOTIFIER_WEBSOCKET_PORT %>\"'
                }]
            },
            dev: {
                src: ['static/views/index.html'],
                overwrite: true,
                replacements: [{
                    from: '<!-- livereload placeholder -->',
                    to: '<script src=\'//<%= env.NOTIFIER_LIVERELOAD_HOST %>:<%= env.NOTIFIER_LIVERELOAD_PORT %>/livereload.js\'></script>'
                }, {
                    from: '<!-- environment name placeholder -->',
                    to: '<%= env.NOTIFIER_ENVIRONMENT %>'
                }]
            },
            production: {
                src: ['static/views/index.html'],
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
                    'convert app-icon.png -geometry 152x152 app-icon-152.png',
                    'convert app-icon.png -geometry 144x144 app-icon-144.png',
                    'convert app-icon.png -geometry 120x120 app-icon-120.png',
                    'convert app-icon.png -geometry 76x76 app-icon-76.png',
                    'convert favicon.png -geometry 48x48 -transparent white temp-48.png',
                    'convert favicon.png -geometry 32x32 -transparent white temp-32.png',
                    'convert favicon.png -geometry 16x16 -transparent white temp-16.png',
                    'optipng -quiet -o 3 app-icon-*.png',
                    'advdef -q -z -4 -i 5 app-icon-*.png',
                    'convert temp-16.png temp-32.png temp-48.png favicon.ico',
                    'rm temp-*.png'
                ].join(' && ')
            },
            'mysqlimport': {
                command: [
                    'BACKUP_FILE=$(find "<%= env.NOTIFIER_DB_BACKUP_DIR %>" -type f -name *.gz | tail -n 1)',
                    'gunzip -c "$BACKUP_FILE"  | mysql <%= env.NOTIFIER_DB_NAME %>'
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
                    host: '<%= env.NOTIFIER_LIVERELOAD_HOST %>',
                    port: '<%= env.NOTIFIER_LIVERELOAD_PORT %>'
                }
            },
            app: {
                files: ['app/**', 'Gruntfile.js'],
                tasks: ['build']
            }
        },

        uglify: {
            app: {
                options: {
                    sourceMap: true
                },
                files: {
                    'static/app.min.js': ['static/js/app.js',
                                          'static/js/controllers.js',
                                          'static/js/directives.js',
                                          'static/js/filters.js',
                                          'static/js/services.js']
                }
            },
            lib: {
                options: {
                    sourceMap: true
                },
                files: {
                    'static/lib.min.js': [
                        'static/angular.js',
                        'static/angular-route.js',
                        'static/faye-browser.js',
                        'static/angular-sanitize.js',
                        'static/angular-resource.js',
                        'static/angular-touch.js',
                        'static/angular-animate.js'
                    ]
                }
            }

        },

    });

    grunt.registerTask('reset', 'Delete the dev database, restart the server', function () {
        var env = grunt.config.get('env');
        if (env.NOTIFIER_DB_DRIVER === 'sqlite') {
            grunt.file.delete(env.NOTIFIER_SQLITE_PATH);
        }
        touch('server/notifier-server.js');
    });

    grunt.registerTask('build', 'Build the application', function (buildType) {
        var environment = grunt.template.process('<%= env.NOTIFIER_ENVIRONMENT %>');

        var tasks = [];

        if (buildType === 'full') {
            tasks = tasks.concat(['clean:full', 'copy', 'uglify']);
        } else {
            tasks = tasks.concat(['clean:app', 'copy:app', 'uglify:app']);
        }

        tasks = tasks.concat(['less', 'autoprefixer', 'replace:websocket']);

        if (environment === 'dev') {
            tasks = tasks.concat('replace:dev');
        } else {
            grunt.config.set('uglify.app.options.sourceMap', false);
            grunt.config.set('uglify.lib.options.sourceMap', false);
            tasks = tasks.concat('replace:production');
        }

        tasks = tasks.concat(['clean:postBuild', 'appcache']);

        grunt.task.run(tasks);
    });

    grunt.registerTask('test', function(suite, type, viewCoverageReport) {
        var tasks;

        if (!suite) {
            grunt.fail.fatal('Test suite not specified (app, server)');
        }

        if (suite === 'server') {
            tasks = ['mocha_istanbul:server'];

            if (viewCoverageReport) {
                tasks.push('open:coverageServer');
            }
        }

        if (suite === 'app') {
            tasks = ['karma:unit'];

            if (viewCoverageReport) {
                tasks.push('open:coverageAppUnit');
            }
        }

        grunt.task.run(tasks);
    });

    grunt.registerTask('migrate', function (undo) {
        var env = grunt.file.readJSON('env.json');
        var configPath = 'migration-config.json';
        var dbEnv = env.NOTIFIER_DB_CONFIG[env.NOTIFIER_DB];

        if (process.env.NOTIFIER_DB_USER) {
            dbEnv.username = process.env.NOTIFIER_DB_USER;
        }

        if (process.env.NOTIFIER_DB_PASS) {
            dbEnv.password = process.env.NOTIFIER_DB_PASS;
        }

        if (process.env.NOTIFIER_DB_NAME) {
            dbEnv.dbname = process.env.NOTIFIER_DB_NAME;
        }

        var migrationConfig = {
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

        var shellTask = 'shell:migration' ;

        if (undo === 'undo') {
            shellTask += ':undo';
        }

        grunt.task.run(shellTask);
    });

    grunt.loadNpmTasks('grunt-appcache');
    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-text-replace');

    if (env.NOTIFIER_ENVIRONMENT === 'dev') {
        grunt.loadNpmTasks('grunt-contrib-jshint');
        grunt.loadNpmTasks('grunt-contrib-watch');
        grunt.loadNpmTasks('grunt-githooks');
        grunt.loadNpmTasks('grunt-http');
        grunt.loadNpmTasks('grunt-karma');
        grunt.loadNpmTasks('grunt-lesslint');
        grunt.loadNpmTasks('grunt-mocha-istanbul');
        grunt.loadNpmTasks('grunt-mocha-test');
        grunt.loadNpmTasks('grunt-open');

        grunt.registerTask('default', ['githooks', 'build:full', 'watch']);
        grunt.registerTask('coverage', ['clean:coverage', 'mocha_istanbul:server', 'open:coverage-server']);
    }
};
