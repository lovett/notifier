var touch = require("touch");
var tokenFile = ".token";

module.exports = function(grunt) {

    require("load-grunt-tasks")(grunt);

    var CONFIG = grunt.file.readJSON("config/default.json");

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        token: (function () {
            try {
                return grunt.file.readJSON(tokenFile);
            } catch (e) {
            }
        }()),

        CONFIG: CONFIG,

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

        http: {
            authtoken: {
                options: {
                    url: "http://localhost:<%= CONFIG.http.port %>/auth",
                    method: "POST",
                    form: {
                        username: CONFIG.defaultUsers[0].username,
                        password: CONFIG.defaultUsers[0].password,
                        label: "grunt",
                    },
                    callback: function (error, response, body) {
                        grunt.file.write(tokenFile, body);
                    }
                }
            },
            onemessage: {
                options: {
                    url: "http://localhost:<%= CONFIG.http.port %>/message",
                    method: "POST",
                    form: {
                        title: "Test message",
                        body: "Testing testing. This message was sent via Grunt on " + new Date(),
                        u: "<%= token.token %>"
                    }
                }
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
            "favicons-dev": {
                command: [
                    "rm -rf public/favicons",
                    "mkdir public/favicon",
                    "convert src/favicon/favicon-dev.svg -geometry 16x16 -transparent white public/favicon/favicon-16.png",
                    "convert src/favicon/favicon-dev.svg -geometry 32x32 -transparent white public/favicon/favicon-32.png",
                    "convert src/favicon/favicon-dev.svg -geometry 48x48 -transparent white public/favicon/favicon-48.png",
                    "convert public/favicon/favicon-16.png public/favicon/favicon-32.png public/favicon/favicon-48.png public/favicon/favicon.ico"
                ].join(" && ")
            },
            "favicons-production": {
                command: [
                    "rm -rf public/favicons",
                    "mkdir public/favicon",
                    "convert src/favicon/favicon.svg -geometry 16x16 -transparent white public/favicon/favicon-16.png",
                    "convert src/favicon/favicon.svg -geometry 32x32 -transparent white public/favicon/favicon-32.png",
                    "convert src/favicon/favicon.svg -geometry 48x48 -transparent white public/favicon/favicon-48.png",
                    "convert public/favicon/favicon-16.png public/favicon/favicon-32.png public/favicon/favicon-48.png public/favicon/favicon.ico"
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

        watch: {
            options: {
                livereload: CONFIG.livereload
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
                            "public/favicon/*",
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

    grunt.registerTask("reset", "Delete the dev database, restart the server", function () {
        grunt.file.delete(CONFIG.sqlite.path);
        touch("server.js");
    });

    grunt.registerTask("build", ["clean:preBuild", "uglify", "less", "concat", "copy", "clean:postBuild", "shell:favicons-dev", "ver"]);
    grunt.registerTask("default", ["githooks", "build", "watch"]);


};
