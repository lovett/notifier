"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var router = express.Router();
router.get('/:count', function (req, res) {
    var filters = {
        attributes: ['id', 'publicId', 'title', 'url', 'body', 'source', 'group', 'received', 'expiresAt'],
        limit: req.params.count,
        order: [['deliveredAt', 'DESC']],
        where: {
            UserId: req.user.id,
            deliveredAt: { $lte: new Date() },
            unread: true,
        },
    };
    if (req.query.since) {
        req.query.since = parseInt(req.query.since, 10) || 0;
        if (req.query.since > 0) {
            filters.where.received = {
                $gt: new Date(req.query.since),
            };
        }
    }
    req.app.locals.Message.findAll(filters).then(function (messages) {
        var now = new Date();
        messages = messages.filter(function (message) {
            if (message.expiresAt === null) {
                return true;
            }
            if (message.expiresAt < now) {
                message.update({ unread: false });
                return false;
            }
            return true;
        });
        messages = messages.map(function (message) {
            var messageValues = message.get({ plain: true });
            delete messageValues.id;
            return messageValues;
        });
        res.send({
            limit: req.params.count,
            messages: messages,
        });
    });
});
exports.default = router;
//# sourceMappingURL=archive.js.map