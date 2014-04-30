module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        CONFIG: grunt.file.readJSON('config/default.json'),

        clean: {
            pre_build: {
                src: ['public/*']
            },
            post_build: {
                src: ["public/app.min.js", "public/version.json"]
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
                              'src/templates/**',
                              'src/svg/megaphone.svg'
                             ],
                        dest: 'public/'
                    },
                    {
                        expand: true,
                        cwd: 'src/images/',
                        src: ['**'],
                        dest: 'public/images'
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
                    'public/all.min.css': ['bower_components/normalize-css/normalize.css',
                                           'src/less/*']
                }
            }
        },

        nodemon: {
            dev: {
                options: {
                    file: 'index.js',
                    ignoredFiles: ['public/**', 'src/**', 'Gruntfile.js'],
                }
            }
        },

        shell: {
            'redis-flush': {
                command: 'redis-cli -n <%= CONFIG.redis.dbnum %> flushdb'
            },
            'redis-populate': {
                command: [
                    'curl -s -d "title=Unarchived Example" -d "noarchive=1" -d "body=Testing testing" -d "url=http://example.com" http://localhost:8080/message',
                ].join(' && ')
            }
        },

        svgstore: {
            options: {
                prefix : 'icon-',
                svg: {
                }
            },
            default: {
                files: {
                    'public/sprites.svg': ['src/svg/*.svg']
                }
            },
        },

        watch: {
            options: {
                livereload: true,
            },
            src: {
                files: ['src/**'],
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
                            'public/*.ico',
                            'public/*.png',
                            'public/all.js',
                            'public/*.css'
                        ],
                        references: [
                            'public/index.html',
                            'public/*.js'
                        ]
                    }
                ],
                versionFile: 'public/version.json'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-svgstore');
    grunt.loadNpmTasks('grunt-ver');

    // Default task(s).
    grunt.registerTask('build', ['clean:pre_build', 'uglify', 'less', 'concat', 'copy', 'svgstore', 'ver', 'clean:post_build']);
    grunt.registerTask('default', ['build', 'watch']);


};
