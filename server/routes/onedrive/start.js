"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var url = require("url");
var router = express.Router();
router.get('/', function (req, res) {
    var endpoint = url.parse('https://login.live.com/oauth20_authorize.srf');
    if (req.user.username !== req.app.locals.config.get('NOTIFIER_DEFAULT_USER')) {
        res.sendStatus(400);
        return;
    }
    endpoint.query = {
        'client_id': req.app.locals.config.get('ONEDRIVE_CLIENT_ID'),
        'scope': 'wl.offline_access onedrive.readwrite',
        'response_type': 'code',
        'redirect_uri': req.app.locals.config.get('ONEDRIVE_REDIRECT')
    };
    res.json({
        url: url.format(endpoint)
    });
});
exports.default = router;
//# sourceMappingURL=start.js.map