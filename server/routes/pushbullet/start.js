"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var url = require("url");
var router = express.Router();
router.get('/', function (req, res) {
    var token;
    function sendUrl(tokenValue) {
        var config, redirectUri;
        config = req.app.locals.config;
        redirectUri = url.format({
            protocol: req.query.protocol,
            host: req.query.host,
            pathname: config.get('NOTIFIER_BASE_URL') + 'authorize/pushbullet/finish',
            query: {
                token: tokenValue
            }
        });
        res.json({
            url: url.format({
                protocol: 'https',
                slashes: true,
                host: 'www.pushbullet.com',
                pathname: '/authorize',
                query: {
                    'client_id': config.get('NOTIFIER_PUSHBULLET_CLIENT_ID'),
                    'response_type': 'code',
                    'redirect_uri': redirectUri
                }
            })
        });
    }
    token = req.app.locals.Token.build({
        key: 'pushbullet',
        label: 'service'
    });
    req.app.locals.Token.generateKeyAndValue(function (key, value) {
        token.value = value;
        token.save().then(function (token) {
            token.setUser(req.user).then(function () {
                sendUrl(token.value);
            });
        }, function (error) {
            res.status(400).json(error);
        });
    });
});
exports.default = router;
//# sourceMappingURL=start.js.map