"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var router = express.Router();
router.post('/', function (req, res) {
    var baseUrl = req.app.locals.config.get('NOTIFIER_BASE_URL');
    var _a = req.cookies.token, key = _a[0], value = _a[1];
    var queryParams = {
        where: { key: key, value: value },
    };
    req.app.locals.Token.destroy(queryParams).then(function () {
        res.clearCookie('token', { path: baseUrl });
    }).finally(function () { return res.sendStatus(200); });
});
exports.default = router;
//# sourceMappingURL=deauth.js.map