"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var router = express.Router();
router.post('/', function (req, res) {
    var update = function (id) {
        req.app.locals.Message.update({ unread: true }, { where: { publicId: id } }).then(function (affectedRows) {
            if (affectedRows[0] === 0) {
                res.sendStatus(400);
                return;
            }
            res.sendStatus(204);
        }).catch(function () {
            res.sendStatus(500);
        });
    };
    if (req.body.hasOwnProperty('publicId')) {
        update(req.body.publicId);
    }
    else {
        res.sendStatus(400);
    }
});
exports.default = router;
//# sourceMappingURL=unclear.js.map