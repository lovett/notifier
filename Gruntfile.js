module.exports = function(grunt) {

    require("load-grunt-tasks")(grunt);
    
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        
        CONFIG: grunt.file.readJSON("config/default.json"),

        clean: {
            preBuild: {
                src: ["public/*"]
            },
            postBuild: {
                src: ["public/app.min.js", "public/version.json"]
            }
        },

        concat: {
            options: {
                separator: "\n",
            },
            dist: {
                src: ["bower_components/angular/angular.min.js",
                      "bower_components/angular-route/angular-route.min.js",
                      "node_modules/faye/browser/faye-browser-min.js",
                      "bower_components/angular-sanitize/angular-sanitize.min.js",
                      "bower_components/moment/min/moment.min.js",
                      "bower_components/angular-moment/angular-moment.min.js",
                      "bower_components/angular-cookies/angular-cookies.min.js",
                      "bower_components/angular-resource/angular-resource.min.js",
                      "public/app.min.js",
                     ],
                dest: "public/all.js",
            },
        },

        copy: {
            main: {
                files: [
                    {
                        expand: true,
                        flatten: true,
                        src: ["bower_components/angular/angular.min.js.map",
                              "bower_components/angular-route/angular-route.min.js.map",
                              "bower_components/angular-sanitize/angular-sanitize.min.js.map",
                              "bower_components/angular/angular.js",
                              "bower_components/angular-cookies/angular-cookies.min.js.map",
                              "bower_components/angular-resource/angular-resource.min.js.map",
                              "src/templates/**",
                              "src/svg/megaphone.svg"
                             ],
                        dest: "public/"
                    },
                    {
                        expand: true,
                        cwd: "src/images/",
                        src: ["**"],
                        dest: "public/images"
                    }
                ]
            }
        },

        githooks: {
            all: {
                "pre-commit": "jshint"
            }
        },
        
        jshint: {
            node: {
                options: {
                    jshintrc: ".jshintrc-node"
                },
                src: ["server.js", "Gruntfile.js"]
            },
            browser: {
                options: {
                    jshintrc: ".jshintrc-browser"
                },
                src: ["src/**.js"]
            }
        },

        less: {
            main: {
                options: {
                    cleancss: true
                },
                files: {
                    "public/all.min.css": ["bower_components/normalize-css/normalize.css",
                                           "src/less/*"]
                }
            }
        },

        nodemon: {
            dev: {
                options: {
                    file: "index.js",
                    ignoredFiles: ["public/**", "src/**", "Gruntfile.js"],
                }
            }
        },

        shell: {
            "redis-flush": {
                command: "redis-cli -n <%= CONFIG.redis.dbnum %> flushdb"
            },
            "redis-populate": {
                command: [
                    "curl -s -d 'title=Unarchived Example' -d 'noarchive=1' -d 'body=Testing testing' -d 'url=http://example.com' http://localhost:8080/message",
                ].join(" && ")
            }
        },

        rsync: {
            options: {
                args: ["--verbose"],
                exclude: [".git*", "node_modules", "bower_components", "clients", "src", "bower.json", ".jshintrc*", ".nodemonignore", "Gruntfile.js", ".DS_Store"],
                recursive: true,
                syncDestIgnoreExcl: true
            },
            production: {
                options: {
                    host: "<%= CONFIG.deployment.production.host %>",
                    src: "./",
                    dest: "<%= CONFIG.deployment.production.path %>",
                }
            }
        },
        
        sshexec: {
              production: {
                  command: "cd <%= CONFIG.deployment.production.path %>; npm install",
                  options: {
                      host: "<%= CONFIG.deployment.production.host %>",
                      username: process.env.USER,
                      agent: process.env.SSH_AUTH_SOCK
                  }
              }
        },

        svgstore: {
            options: {
                prefix : "icon-",
                svg: {
                }
            },
            default: {
                files: {
                    "public/sprites.svg": ["src/svg/*.svg"]
                }
            },
        },

        watch: {
            options: {
                livereload: true,
            },
            src: {
                files: ["src/**", "Gruntfile.js"],
                tasks: ["build"]
            }
        },

        uglify: {
            js: {
                options: {
                    sourceMap: "public/app.min.js.map"
                },
                files: {
                    "public/app.min.js": ["src/app.js", "src/controllers.js"]
                }
            }
        },

        ver: {
            main: {
                phases: [
                    {
                        files: [
                            "public/*.ico",
                            "public/*.png",
                            "public/all.js",
                            "public/*.css"
                        ],
                        references: [
                            "public/index.html",
                            "public/*.js"
                        ]
                    }
                ],
                versionFile: "public/version.json"
            }
        }
    });

    grunt.registerTask("build", ["clean:preBuild", "uglify", "less", "concat", "copy", "svgstore", "ver", "clean:postBuild"]);
    grunt.registerTask("default", ["githooks", "build", "watch"]);


};
