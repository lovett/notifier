"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var useragent = require("useragent");
var router = express.Router();
router.post('/', function (req, res) {
    var tokenLabel = req.body.label || '';
    tokenLabel = tokenLabel.replace(/[^a-zA-Z0-9-\.\/ ]/, '');
    if (tokenLabel === '') {
        tokenLabel = useragent.parse(req.get('user-agent')).toString();
    }
    var token = req.app.locals.Token.build({
        label: tokenLabel,
        persist: [true, '1', 'true'].indexOf(req.body.persist) > -1,
    });
    var pruneCallback = function (t) {
        t.save()
            .then(function () { return t.setUser(req.user); })
            .then(sendResponse)
            .catch(function (err) {
            res.status(400).json(err);
        });
    };
    var generateCallback = function (key, value) {
        token.key = key;
        token.value = value;
        req.app.locals.Token.prune(pruneCallback(token));
    };
    req.app.locals.Token.generateKeyAndValue(generateCallback);
    var sendResponse = function () {
        var key = token.key;
        var value = token.value;
        var expires;
        if (token.persist) {
            expires = new Date(Date.now() + (86400000 * 30));
        }
        res.cookie('token', key + "," + value, {
            expires: expires,
            path: req.app.locals.config.get('NOTIFIER_BASE_URL'),
        });
        res.format({
            'application/json': function () { return res.json({ key: key, value: value }); },
            'default': function () { return res.status(406).send('Not Acceptable'); },
            'text/plain': function () { return res.send(key + "," + value); },
        });
    };
});
exports.default = router;
//# sourceMappingURL=auth.js.map