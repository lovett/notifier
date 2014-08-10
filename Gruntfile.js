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
                cache: {
                    patterns: [
                        'public/*.min.js',
                        'public/*.min.css',
                        'public/templates/*.html',
                        'public/font/*',
                        'public/favicon/*'
                    ]
                },
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
            app: {
                src: ['public/app*', 'public/all*']
            },
            lib: {
                src: ['public/lib*']
            },
            postBuild: {
                src: ['public/version.json', 'public/favicon/*.png', 'public/font/LICENSE.txt']
            }
        },

        copy: {
            app: {
                files: [
                    {
                        expand: true,
                        cwd: 'src/',
                        src: ['**'],
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
                            'bower_components/angular/angular.js',
                            'bower_components/angular-route/angular-route.js',
                            'node_modules/faye/browser/faye-browser.js',
                            'bower_components/angular-sanitize/angular-sanitize.js',
                            'bower_components/moment/moment.js',
                            'bower_components/angular-moment/angular-moment.js',
                            'bower_components/angular-resource/angular-resource.js',
                            'bower_components/angular-touch/angular-touch.js',
                            'bower_components/angular-animate/angular-animate.js',
                        ],
                        dest: 'public/'
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
                        group: 'test',
                        url: 'http://example.com'
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

        jshint: {
            node: {
                options: {
                    jshintrc: '.jshintrc-node'
                },
                src: ['server.js', 'Gruntfile.js', 'clients/*.js']
            },

            mocha: {
                options: {
                    jshintrc: '.jshintrc-node'
                },
                src: ['test/server/*-spec.js']
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
                    bail: true,
                    require: 'test/server/world.js'
                },
                src: ['test/server/*-spec.js']
            }
        },

        'mocha_istanbul': {
            server: {
                src: 'test/server',
                options: {
                    mask: '*-spec.js',
                    require: ['test/server/world.js']
                }
            }
        },

        open : {
            'coverage-server': {
                path: 'coverage/lcov-report/notifier/server.js.html'
            }
        },

        replace: {
            websocket: {
                src: ['public/*.html'],
                overwrite: true,
                replacements: [{
                    from: '<meta name=\"websocket port\" content=\"\" />',
                    to: '<meta name=\"websocket port\" content=\"<%= env.NOTIFIER_WEBSOCKET_PORT %>\" />'
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
                    'rm -rf public/favicon',
                    'mkdir public/favicon',
                    'convert src/favicon/favicon-dev.svg -geometry 16x16 -transparent white public/favicon/favicon-16.png',
                    'convert src/favicon/favicon-dev.svg -geometry 32x32 -transparent white public/favicon/favicon-32.png',
                    'convert src/favicon/favicon-dev.svg -geometry 48x48 -transparent white public/favicon/favicon-48.png',
                    'convert public/favicon/favicon-16.png public/favicon/favicon-32.png public/favicon/favicon-48.png public/favicon/favicon.ico'
                ].join(' && ')
            },
            'favicons-production': {
                command: [
                    'rm -rf public/favicon',
                    'mkdir public/favicon',
                    'convert src/favicon/favicon.svg -geometry 16x16 -transparent white public/favicon/favicon-16.png',
                    'convert src/favicon/favicon.svg -geometry 32x32 -transparent white public/favicon/favicon-32.png',
                    'convert src/favicon/favicon.svg -geometry 48x48 -transparent white public/favicon/favicon-48.png',
                    'convert public/favicon/favicon-16.png public/favicon/favicon-32.png public/favicon/favicon-48.png public/favicon/favicon.ico'
                ].join(' && ')
            },

            'server': {
                command: 'nodemon --watch server.js'
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
            app: {
                options: {
                    sourceMap: 'public/app.min.js.map'
                },
                files: {
                    'public/app.min.js': ['public/app.js', 'public/controllers.js', 'public/services.js']
                }
            },
            lib: {
                options: {
                    sourceMap: 'public/lib.min.js.map',
                },
                files: {
                    'public/lib.min.js': [
                        'public/angular.js',
                        'public/angular-route.js',
                        'public/faye-browser.js',
                        'public/angular-sanitize.js',
                        'public/moment.js',
                        'public/angular-moment.js',
                        'public/angular-resource.js',
                        'public/angular-touch.js',
                        'public/angular-animate.js'
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
        touch('server.js');
    });

    grunt.registerTask('build', 'Build the application', function (buildType) {
        var environment = grunt.template.process('<%= env.NOTIFIER_ENVIRONMENT %>');

        var tasks = [];

        if (buildType === 'full') {
            tasks = tasks.concat(['clean', 'copy', 'uglify']);
        } else {
            tasks = tasks.concat(['clean:app', 'copy:app', 'uglify:app']);
        }

        tasks = tasks.concat(['less', 'replace:websocket']);

        if (environment === 'dev') {
            tasks = tasks.concat(['shell:favicons-dev', 'replace:dev']);
        } else {
            tasks = tasks.concat(['shell:favicons-production', 'replace:production']);
        }

        tasks = tasks.concat(['clean:postBuild', 'appcache']);

        grunt.task.run(tasks);
    });

    grunt.registerTask('coverage', ['mocha_istanbul:server', 'open:coverage-server']);

    grunt.registerTask('default', ['githooks', 'build:full', 'watch']);
};
