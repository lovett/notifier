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
                      'public/app.min.js',
                     ],
                dest: 'public/all.js',
            },
        },

        copy: {
            main: {
                expand: true,
                flatten: true,
                src: ['bower_components/angular/angular.min.js.map',
                      'bower_components/angular-route/angular-route.min.js.map',
                      'node_modules/faye/browser/faye-browser-min.js.map',
                      'index.html',
                      'messages.html',
                      'favicon.ico',
                      'bower_components/foundation/js/vendor/custom.modernizr.js'],
                dest: 'public/'
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
                                           'app.less']
                }
            }
        },

        nodemon: {
            dev: {
                options: {
                    file: 'index.js',
                    ignoredFiles: ['public/**', 'app.js', 'controllers.js', 'Gruntfile.js'],
                }
            }
        },

        watch: {
            options: {
                spawn: false,
                livereload: true,
            },
            css: {
                files: ['app.less', '!\..*app.less'],
                tasks: ['less']
            },
            js: {
                files: ['*.js', '!index.js'],
                tasks: ['uglify', 'concat'],
            },
            html: {
                files: ['*.html'],
                tasks: 'copy'
            }
        },

        uglify: {
            js: {
                options: {
                    sourceMap: 'public/app.min.js.map'
                },
                files: {
                    'public/app.min.js': ['app.js', 'controllers.js']
                }
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

    // Default task(s).
    grunt.registerTask('build', ['clean:pre_build', 'uglify', 'less', 'concat', 'copy', 'clean:post_build']);
    grunt.registerTask('default', ['build', 'watch']);


};
