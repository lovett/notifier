"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var url = require("url");
var needle = require("needle");
var router = express.Router();
router.get('/', function (req, res) {
    var config, querystringToken, tokenUrl;
    config = req.app.locals.config;
    tokenUrl = url.format({
        protocol: 'https',
        slashes: true,
        host: 'api.pushbullet.com',
        pathname: '/oauth2/token'
    });
    querystringToken = req.query.token.replace(/\?.*/, '');
    req.app.locals.Token.find({
        include: [req.app.locals.User],
        where: {
            value: querystringToken
        }
    }).then(function (token) {
        if (!token || !token.User) {
            res.redirect(config.get('NOTIFIER_BASE_URL'));
            return;
        }
        if (!req.query.code) {
            req.app.locals.Token.destroy({
                where: {
                    key: 'pushbullet',
                    UserId: token.User.id
                }
            }).then(function () { return res.redirect(config.get('NOTIFIER_BASE_URL')); });
            return;
        }
        needle.post(tokenUrl, {
            'grant_type': 'authorization_code',
            'client_id': config.get('NOTIFIER_PUSHBULLET_CLIENT_ID'),
            'client_secret': config.get('NOTIFIER_PUSHBULLET_CLIENT_SECRET'),
            'code': req.query.code
        }, function (err, resp, body) {
            req.app.locals.Token.destroy({
                where: {
                    key: 'pushbullet',
                    UserId: token.User.id,
                    id: {
                        $ne: token.id
                    }
                }
            }).then(function () {
                token.updateAttributes({
                    value: body.access_token,
                    persist: true
                }).then(function () { return res.redirect(config.get('NOTIFIER_BASE_URL')); });
            });
        });
    }, function () { return res.sendStatus(400); });
});
exports.default = router;
//# sourceMappingURL=finish.js.map