var express, router, util;

express = require('express');

util = require('util');

router = express.Router();

/**
 * The application homepage
 */
router.get('/', function(req, res, next) {
    var livereloadUrl, title;

    if (res.locals.livereload_host) {
        livereloadUrl = util.format(
            '//%s:%d/livereload.js',
            res.locals.livereload_host,
            res.locals.livereload_port
        );
    }

    title = 'Notifier';
    if (res.locals.env !== 'production') {
        title += ' ' + res.locals.env;
    }

    res.render('index', {
        'base_href': res.locals.base_url,
        'websocket_port': res.locals.websocket_port,
        'livereload_url': livereloadUrl,
        'title': title
    });
});

module.exports = exports = router;
