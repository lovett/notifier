module.exports = function(config) {
    config.set({

        // base path, that will be used to resolve files and exclude
        basePath: '../..',


        // frameworks to use
        frameworks: ['mocha', 'chai', 'sinon'],


        // list of files / patterns to load in the browser
        files: [
            'static/lib.min.js',
            'bower_components/angular-mocks/angular-mocks.js',
            'static/js/*.js',
            'app/test/*spec.js',
            'app/views/*.html'
        ],


        // list of files to exclude
        exclude: [
            
        ],


        // test results reporter to use
        // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
        reporters: ['progress', 'coverage'],

        
        preprocessors: {
            'static/js/*.js': 'coverage',
            'app/views/*.html': 'ng-html2js'
        },

        ngHtml2JsPreprocessor: {
            moduleName: 'templates',
            stripPrefix: 'app'
        },
        
        coverageReporter: {
            type: 'lcov',
            dir: 'coverage/',
            subdir: function (browser) {
                return browser.toLowerCase().split(/[ /-]/)[0] + '-unit';
            }
        },
        

        // web server port
        port: 9876,


        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: false,


        // Start these browsers, currently available:
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera
        // - Safari (only Mac)
        // - PhantomJS
        // - IE (only Windows)
        browsers: ['Firefox'],


        // If browser does not capture in given timeout [ms], kill it
        captureTimeout: 10000,


        // Continuous Integration mode
        // if true, it capture browsers, run tests and exit
        singleRun: true
    });
};
