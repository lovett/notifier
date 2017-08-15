"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var router = express.Router();
router.post('/', function (req, res) {
    req.user.purgeServiceToken(req.body.service, function (count) {
        if (count === 0) {
            res.sendStatus(500);
            return;
        }
        res.sendStatus(200);
    });
});
exports.default = router;
//# sourceMappingURL=revoke.js.map