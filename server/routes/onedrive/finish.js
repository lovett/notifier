"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var fs = require("fs");
var needle = require("needle");
var router = express.Router();
router.get('/', function (req, res) {
    var callback, config;
    config = req.app.locals.config;
    if (!req.query.code) {
        res.sendStatus(400);
        return;
    }
    needle.post('https://login.live.com/oauth20_token.srf', {
        'client_id': config.get('ONEDRIVE_CLIENT_ID'),
        'redirect_uri': config.get('ONEDRIVE_REDIRECT'),
        'client_secret': config.get('ONEDRIVE_CLIENT_SECRET'),
        'code': req.query.code,
        'grant_type': 'authorization_code'
    }, callback);
    callback = function (err, resp) {
        if (err) {
            res.send(500);
            return;
        }
        if (resp.body.error) {
            res.status(400).json(resp.body);
            return;
        }
        fs.writeFile(config.get('ONEDRIVE_AUTH_FILE'), JSON.stringify(resp.body), function (err) {
            if (err) {
                res.sendStatus(500);
                return;
            }
            res.redirect(config.get('NOTIFIER_BASE_URL'));
        });
    };
});
exports.default = router;
//# sourceMappingURL=finish.js.map