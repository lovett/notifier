'use strict';

let express, router, util;

express = require('express');

util = require('util');

router = express.Router();

/**
 * The application homepage
 */
router.get('/', (req, res) => {
    let config, livereloadUrl, title;

    config = req.app.locals.config;

    if (config.get('NOTIFIER_LIVERELOAD_HOST') && config.get('NOTIFIER_LIVERELOAD_PORT')) {
        livereloadUrl = util.format(
            '//%s:%d/livereload.js',
            config.get('NOTIFIER_LIVERELOAD_HOST'),
            config.get('NOTIFIER_LIVERELOAD_PORT')
        );
    }

    title = 'Notifier';
    if (req.app.env && req.app.env !== 'production') {
        title += ' ' + req.app.env;
    }

    res.render('index', {
        'base_href': config.get('NOTIFIER_BASE_URL'),
        'websocket_port': config.get('NOTIFIER_WEBSOCKET_PORT'),
        'livereload_url': livereloadUrl,
        'title': title
    });
});

module.exports = exports = router;
