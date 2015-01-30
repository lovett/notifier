
var touch = require('touch');
var tokenFile = '.token';

module.exports = function(grunt) {

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        env: grunt.file.readJSON('env.json'),

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
                        'static/favicon/*'
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
            app: {
                src: ['static/app*', 'static/all*']
            },
            lib: {
                src: ['static/lib*']
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
                        src: ['**'],
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
                    method: 'POST',
                    form: {
                        username: '<%= env.NOTIFIER_DEFAULT_USER %>',
                        password: '<%= env.NOTIFIER_DEFAULT_PASSWORD %>',
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
                        body: 'Testing testing. This message was sent via Grunt on ' + new Date(),
                        group: 'test',
                        url: 'https://ravage.lovett.me',
                        localId: 'test'
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
                    to: '<script src=\'//<%= env.NOTIFIER_DEV_HOST %>:<%= env.NOTIFIER_LIVERELOAD %>/livereload.js\'></script>'
                }]
            },
            production: {
                src: ['static/views/index.html'],
                overwrite: true,
                replacements: [{
                    from: '<!-- livereload placeholder -->',
                    to: ''
                }]
            }
        },

        shell: {
            'favicons-dev': {
                command: [
                    'rm -rf static/favicon',
                    'mkdir static/favicon',
                    'convert app/favicon/favicon-dev.svg -geometry 16x16 -transparent white static/favicon/favicon-16.png',
                    'convert app/favicon/favicon-dev.svg -geometry 32x32 -transparent white static/favicon/favicon-32.png',
                    'convert app/favicon/favicon-dev.svg -geometry 48x48 -transparent white static/favicon/favicon-48.png',
                    'convert static/favicon/favicon-16.png static/favicon/favicon-32.png static/favicon/favicon-48.png static/favicon/favicon.ico',
                    'convert app/favicon/favicon-dev.svg -geometry 152x152 static/favicon/favicon-152.png',
                    'convert app/favicon/favicon-dev.svg -geometry 120x120 static/favicon/favicon-120.png',
                    'convert app/favicon/favicon-dev.svg -geometry 180x180 static/favicon/favicon-180.png',
                    'convert app/favicon/favicon-dev.svg -geometry 144x144 static/favicon/favicon-144.png',
                ].join(' && ')
            },
            'favicons-production': {
                command: [
                    'rm -rf static/favicon',
                    'mkdir static/favicon',
                    'convert app/favicon/favicon.svg -geometry 16x16 -transparent white static/favicon/favicon-16.png',
                    'convert app/favicon/favicon.svg -geometry 32x32 -transparent white static/favicon/favicon-32.png',
                    'convert app/favicon/favicon.svg -geometry 48x48 -transparent white static/favicon/favicon-48.png',
                    'convert static/favicon/favicon-16.png static/favicon/favicon-32.png static/favicon/favicon-48.png static/favicon/favicon.ico',
                    'convert app/favicon/favicon.svg -geometry 152x152 static/favicon/favicon-152.png',
                    'convert app/favicon/favicon.svg -geometry 120x120 static/favicon/favicon-120.png',
                    'convert app/favicon/favicon.svg -geometry 180x180 static/favicon/favicon-180.png',
                    'convert app/favicon/favicon.svg -geometry 144x144 static/favicon/favicon-144.png',
                ].join(' && ')
            },
            'server': {
                command: 'nodemon --watch server server/notifier-server.js'
            },
            'mysqlimport': {
                command: [
                    'BACKUP_FILE=$(find "<%= env.NOTIFIER_DB_BACKUP_DIR %>" -type f -name *.gz | tail -n 1)',
                    'gunzip -c "$BACKUP_FILE"  | mysql <%= env.NOTIFIER_DB_NAME %>'
                ].join(' && ')
            }
        },

        watch: {
            options: {
                livereload: '<%= env.NOTIFIER_LIVERELOAD %>'
            },
            app: {
                files: ['app/**', 'Gruntfile.js'],
                tasks: ['build']
            }
        },

        uglify: {
            app: {
                options: {
                    sourceMap: 'static/app.min.js.map'
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
                    sourceMap: 'static/lib.min.js.map',
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
            tasks = tasks.concat(['clean', 'copy', 'uglify']);
        } else {
            tasks = tasks.concat(['clean:app', 'copy:app', 'uglify:app']);
        }

        tasks = tasks.concat(['less', 'autoprefixer', 'replace:websocket']);

        if (environment === 'dev') {
            tasks = tasks.concat(['shell:favicons-dev', 'replace:dev']);
        } else {
            tasks = tasks.concat(['shell:favicons-production', 'replace:production']);
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

    grunt.registerTask('coverage', ['clean:coverage', 'mocha_istanbul:server', 'open:coverage-server']);

    grunt.registerTask('default', ['githooks', 'build:full', 'watch']);
};
