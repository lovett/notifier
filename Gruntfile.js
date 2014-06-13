var touch = require('touch');
var tokenFile = '.token';

module.exports = function(grunt) {

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        env: grunt.file.readJSON('env.json'),

        appcache: {
            options: {
                basePath: 'public'
            },
            all: {
                dest: 'public/notifier.appcache',
                cache: 'public/**/*',
                network: '*'
            }
        },

        token: (function () {
            try {
                return grunt.file.readJSON(tokenFile);
            } catch (e) {
            }
        }()),


        clean: {
            preBuild: {
                src: ['public/*']
            },
            postBuild: {
                src: ['public/app.min.js', 'public/version.json']
            }
        },

        concat: {
            options: {
                separator: '\n',
            },
            dist: {
                src: ['bower_components/angular/angular.min.js',
                      'bower_components/angular-route/angular-route.min.js',
                      'node_modules/faye/browser/faye-browser-min.js',
                      'bower_components/angular-sanitize/angular-sanitize.min.js',
                      'bower_components/moment/min/moment.min.js',
                      'bower_components/angular-moment/angular-moment.min.js',
                      'bower_components/angular-resource/angular-resource.min.js',
                      'bower_components/angular-touch/angular-touch.min.js',
                      'bower_components/angular-animate/angular-animate.min.js',
                      'public/app.min.js',
                     ],
                dest: 'public/all.js',
            },
        },

        copy: {
            main: {
                files: [
                    {
                        expand: true,
                        flatten: true,
                        src: ['bower_components/angular/angular.min.js.map',
                              'bower_components/angular-route/angular-route.min.js.map',
                              'bower_components/angular-sanitize/angular-sanitize.min.js.map',
                              'bower_components/angular/angular.js',
                              'bower_components/angular-resource/angular-resource.min.js.map',
                              'bower_components/angular-touch/angular-touch.min.js.map',
                              'bower_components/angular-animate/angular-animate.min.js.map',
                              'src/svg/megaphone.svg',
                              'src/index.html',
                              'src/robots.txt'
                             ],
                        dest: 'public/'
                    },
                    {
                        expand: true,
                        cwd: 'src/images/',
                        src: ['**'],
                        dest: 'public/images'
                    },
                    {
                        expand: true,
                        cwd: 'src/font/',
                        src: ['**.ttf'],
                        dest: 'public/font'
                    },
                    {
                        expand: true,
                        cwd: 'src/templates/',
                        src: ['**'],
                        dest: 'public/templates'
                    }
                ]
            }
        },

        githooks: {
            all: {
                'pre-commit': 'jshint'
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
                    headers: {
                        'x-token': '<%= token.token %>'
                    },
                    form: {
                        title: 'Test message',
                        body: 'Testing testing. This message was sent via Grunt on ' + new Date(),
                        url: 'http://example.com'
                    }
                }
            }
        },

        jshint: {
            node: {
                options: {
                    jshintrc: '.jshintrc-node'
                },
                src: ['server.js', 'Gruntfile.js', 'clients/*.js']
            },
            browser: {
                options: {
                    jshintrc: '.jshintrc-browser'
                },
                src: ['src/**.js']
            }
        },

        less: {
            main: {
                options: {
                    cleancss: true
                },
                files: {
                    'public/all.min.css': ['bower_components/normalize-css/normalize.css',
                                           'bower_components/angular/angular-csp.css',
                                           'src/less/*']
                }
            }
        },

        mochaTest: {
            server: {
                options: {
                    reporter: 'spec',
                    bail: true
                },
                src: ['test/server/*-spec.js']
            }
        },

        'mocha_istanbul': {
            server: {
                src: 'test/server',
                options: {
                    mask: '*-spec.js'
                }
            }
        },

        replace: {
            websocket: {
                src: ['public/*.html'],
                overwrite: true,
                replacements: [{
                    from: '<meta name=\'websocket port\' content=\'\' />',
                    to: '<meta name=\'websocket port\' content=\'<%= env.NOTIFIER_WEBSOCKET_PORT %>\' />'
                }]
            },
            dev: {
                src: ['public/index.html'],
                overwrite: true,
                replacements: [{
                    from: '<!-- livereload placeholder -->',
                    to: '<script src=\'//<%= env.NOTIFIER_DEV_HOST %>:<%= env.NOTIFIER_LIVERELOAD %>/livereload.js\'></script>'
                }]
            },
            production: {
                src: ['public/index.html'],
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
                    'rm -rf public/favicons',
                    'mkdir public/favicon',
                    'convert src/favicon/favicon-dev.svg -geometry 16x16 -transparent white public/favicon/favicon-16.png',
                    'convert src/favicon/favicon-dev.svg -geometry 32x32 -transparent white public/favicon/favicon-32.png',
                    'convert src/favicon/favicon-dev.svg -geometry 48x48 -transparent white public/favicon/favicon-48.png',
                    'convert public/favicon/favicon-16.png public/favicon/favicon-32.png public/favicon/favicon-48.png public/favicon/favicon.ico'
                ].join(' && ')
            },
            'favicons-production': {
                command: [
                    'rm -rf public/favicons',
                    'mkdir public/favicon',
                    'convert src/favicon/favicon.svg -geometry 16x16 -transparent white public/favicon/favicon-16.png',
                    'convert src/favicon/favicon.svg -geometry 32x32 -transparent white public/favicon/favicon-32.png',
                    'convert src/favicon/favicon.svg -geometry 48x48 -transparent white public/favicon/favicon-48.png',
                    'convert public/favicon/favicon-16.png public/favicon/favicon-32.png public/favicon/favicon-48.png public/favicon/favicon.ico'
                ].join(' && ')
            }
        },

        watch: {
            options: {
                livereload: '<%= env.NOTIFIER_LIVERELOAD %>'
            },
            src: {
                files: ['src/**', 'Gruntfile.js'],
                tasks: ['build']
            }
        },

        uglify: {
            js: {
                options: {
                    sourceMap: 'public/app.min.js.map'
                },
                files: {
                    'public/app.min.js': ['src/app.js', 'src/controllers.js']
                }
            }
        },

        ver: {
            main: {
                phases: [
                    {
                        files: [
                            'public/favicon/*',
                            'public/*.png',
                            'public/all.js',
                            'public/*.css',
                            'public/templates/*.html'
                        ],
                        references: [
                            'public/index.html',
                            'public/*.js',
                            'public/templates/*.html'
                        ]
                    }
                ],
                versionFile: 'public/version.json'
            }
        }
    });

    grunt.registerTask('reset', 'Delete the dev database, restart the server', function () {
        var env = grunt.config.get('env');
        if (env.NOTIFIER_DB_DRIVER === 'sqlite') {
            grunt.file.delete(env.NOTIFIER_SQLITE_PATH);
        }
        touch('server.js');
    });

    grunt.registerTask('build', 'Build the application', function () {
        var environment = grunt.template.process('<%= env.NOTIFIER_ENVIRONMENT %>');

        grunt.task.run(['clean:preBuild', 'uglify', 'less', 'concat', 'copy', 'clean:postBuild', 'replace:websocket']);

        if (environment === 'dev') {
            grunt.task.run(['shell:favicons-dev', 'replace:dev']);
        } else {
            grunt.task.run(['shell:favicons-production', 'replace:production']);
        }

        grunt.task.run(['ver', 'appcache']);
    });

    grunt.registerTask('coverage', ['mocha_istanbul:server']);

    grunt.registerTask('default', ['githooks', 'build', 'watch']);


};
