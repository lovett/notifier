"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var util = require("util");
var router = express.Router();
router.get('/', function (req, res) {
    var livereloadUrl;
    var config = req.app.locals.config;
    if (config.get('NOTIFIER_LIVERELOAD_HOST') && config.get('NOTIFIER_LIVERELOAD_PORT')) {
        livereloadUrl = util.format('//%s:%d/livereload.js', config.get('NOTIFIER_LIVERELOAD_HOST'), config.get('NOTIFIER_LIVERELOAD_PORT'));
    }
    var title = 'Notifier';
    if (req.app.get('env') && req.app.get('env') !== 'production') {
        title += ' ' + req.app.get('env');
    }
    res.render('index', {
        base_href: config.get('NOTIFIER_BASE_URL'),
        livereload_url: livereloadUrl,
        title: title,
        websocket_port: config.get('NOTIFIER_WEBSOCKET_PORT'),
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map