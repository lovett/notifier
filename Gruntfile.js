module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: {
            pre_build: {
                src: ['public/*']
            },
            post_build: {
                src: ["public/app.min.js"]
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
                      'bower_components/angular-faye/build/angular-faye.min.js',
                      'bower_components/angular-sanitize/angular-sanitize.min.js',
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
                              'node_modules/faye/browser/faye-browser-min.js.map',
                              'bower_components/angular-sanitize/angular-sanitize.min.js.map',
                              'src/templates/**'],
                        dest: 'public/'
                    },
                    {
                        expand: true,
                        cwd: 'src/images/',
                        src: ['**'],
                        dest: 'public/images'
                    }
                ]
            },

            fonts: {
                expand: true,
                cwd: 'src/assets/fonts/',
                src: ['**'],
                dest: 'public/fonts'
            }
        },

        less: {
            main: {
                options: {
                    cleancss: true
                },
                files: {
                    'public/all.min.css': ['bower_components/foundation/css/normalize.css',
                                           'bower_components/foundation/css/foundation.css',
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
                command: 'redis-cli flushdb'
            },
            'redis-populate': {
                command: 'curl -s -d "title=Test" -d "noarchive=1" -d "body=Testing testing 1 2 3" -d "url=http://example.com" http://localhost:8080/message'
            }
        },


        watch: {
            options: {
                livereload: true,
            },
            css: {
                files: ['src/less/**'],
                tasks: ['less']
            },
            js: {
                files: ['src/*.js'],
                tasks: ['uglify', 'concat'],
            },
            html: {
                files: ['src/templates/**'],
                tasks: 'copy'
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
                            'public/*.js',
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
    grunt.loadNpmTasks('grunt-ver');

    // Default task(s).
    grunt.registerTask('build', ['clean:pre_build', 'uglify', 'less', 'concat', 'copy', 'ver', 'clean:post_build']);
    grunt.registerTask('default', ['build', 'watch']);


};
