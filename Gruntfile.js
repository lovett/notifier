'use strict';

let nconf = require('nconf');

module.exports = function(grunt) {
    nconf.env();

    if (process.env.NODE_ENV) {
        nconf.file('local', 'config-' + process.env.NODE_ENV + '.json');
    }

    nconf.defaults({
        'NOTIFIER_BASE_URL': '/'
    });

    grunt.initConfig({
        nconf: nconf,

        clean: {
            full: {
                src: ['public']
            },
            app: {
                src: ['public/app*', 'public/all*']
            }
        },

        watch: {
            options: {
                livereload: {
                    host: nconf.get('NOTIFIER_LIVERELOAD_HOST'),
                    port: nconf.get('NOTIFIER_LIVERELOAD_PORT')
                }
            },

            app: {
                files: ['app/**', 'Gruntfile.js', '!app/**/.*', 'server/views/*.ejs', '!app/**/flycheck_*'],
                tasks: ['build']
            }
        },
    });

    grunt.registerTask('build', 'Build the browser UI', () => {
        let tasks;

        grunt.task.run(tasks);

        grunt.file.write('build.txt', new Date());

    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', ['build', 'watch']);
};
