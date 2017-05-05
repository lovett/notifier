var express, router, util;

express = require('express');

util = require('util');

router = express.Router();

/**
 * The application homepage
 */
router.get('/', function(req, res, next) {
    var config, livereloadUrl, title;

    config = res.app.config;

    if (config.get('NOTIFIER_LIVERELOAD_HOST') && confing.get('NOTIFIER_LIVERELOAD_PORT')) {
        livereloadUrl = util.format(
            '//%s:%d/livereload.js',
            config.get('NOTIFIER_LIVERELOAD_HOST'),
            config.get('NOTIFIER_LIVERELOAD_PORT')
        );
    }

    title = 'Notifier';
    if (res.app.env !== 'production') {
        title += ' ' + res.app.env;
    }

    res.render('index', {
        'base_href': config.get('NOTIFIER_BASE_URL'),
        'websocket_port': config.get('NOTIFIER_WEBSOCKET_PORT'),
        'livereload_url': livereloadUrl,
        'title': title
    });
});

module.exports = exports = router;
