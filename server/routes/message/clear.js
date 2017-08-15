"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var publish_message_1 = require("../../helpers/publish-message");
var router = express.Router();
router.post('/', function (req, res) {
    var update = function (id) {
        req.app.locals.Message.update({ unread: false }, { where: { publicId: id } }).then(function (affectedRows) {
            if (affectedRows[0] === 0) {
                res.sendStatus(304);
                return;
            }
            publish_message_1.default(req.app, req.user, {
                'retracted': id
            });
            res.sendStatus(204);
            return true;
        }).catch(function () { return res.sendStatus(500); });
    };
    if (req.body.hasOwnProperty('publicId')) {
        update(req.body.publicId);
    }
    else if (req.body.hasOwnProperty('localId')) {
        req.app.locals.Message.find({
            where: {
                localId: req.body.localId,
                unread: true
            },
            limit: 1
        }).then(function (message) {
            if (!message) {
                res.sendStatus(404);
            }
            else {
                update(message.publicId);
            }
        });
    }
    else {
        res.sendStatus(400);
    }
});
exports.default = router;
//# sourceMappingURL=clear.js.map