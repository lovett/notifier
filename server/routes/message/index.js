"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var publish_message_1 = require("../../helpers/publish-message");
var dateparser = require('dateparser');
var router = express.Router();
router.post('/', function (req, res, next) {
    var err, message;
    if (Object.keys(req.body).length === 0) {
        err = new Error('Message is blank');
        res.status(400);
        return next(err);
    }
    message = req.app.locals.Message.build({
        received: new Date()
    });
    message.attributes.forEach(function (key) {
        var fieldName, parseResult;
        if (key === 'id' || key === 'publicId') {
            return;
        }
        if (key === 'expiresAt') {
            fieldName = 'expiration';
        }
        else {
            fieldName = key;
        }
        if (req.body.hasOwnProperty(fieldName) === false) {
            return;
        }
        if (req.body[fieldName].trim() === '') {
            return;
        }
        if (fieldName === 'expiration') {
            parseResult = dateparser.parse(req.body[fieldName]);
            if (parseResult !== null) {
                message[key] = new Date(Date.now() + parseResult.value);
            }
            return;
        }
        message[key] = req.body[key].trim();
    });
    if (message.localId) {
        req.app.locals.Message.findAll({
            attributes: ['publicId'],
            where: {
                localId: req.body.localId,
                unread: true,
                UserId: req.user.id,
                publicId: {
                    $ne: message.publicId
                }
            }
        }).then(function (existingMessages) {
            var ids;
            if (existingMessages.length == 0) {
                return;
            }
            ids = existingMessages.map(function (existingMessage) {
                return existingMessage.publicId;
            });
            req.app.locals.Message.update({
                unread: false
            }, {
                where: {
                    publicId: {
                        $in: ids
                    }
                }
            }).then(function (updatedRows) {
                if (updatedRows[0] > 0) {
                    ids.forEach(function (id) {
                        publish_message_1.default(req.app, req.user, {
                            'retracted': id
                        });
                    });
                }
            });
            return null;
        });
    }
    message.save().then(function () {
        message.setUser(req.user).then(function () {
            publish_message_1.default(req.app, req.user, message);
            res.sendStatus(204);
        });
    }).catch(function (error) {
        var err, message = '';
        error.errors.forEach(function (err) {
            message += err.message + ';';
        });
        err = new Error(message);
        res.status(400);
        next(err);
    });
});
router.patch('/', function (req, res) {
    var fields;
    fields = ['title', 'url', 'body', 'source', 'group', 'deliveredAt'].reduce(function (acc, field) {
        if (req.body.hasOwnProperty(field)) {
            acc[field] = req.body[field];
        }
        return acc;
    }, {});
    req.app.locals.Message.update(fields, {
        where: {
            'publicId': req.body.publicId,
            'UserId': req.user.id
        }
    }).then(function (affectedRows) {
        if (affectedRows[0] !== 1) {
            res.sendStatus(400);
        }
        req.app.locals.Message.findOne({
            where: {
                'publicId': req.body.publicId,
                'UserId': req.user.id
            }
        }).then(function (message) {
            publish_message_1.default(req.app, req.user, message);
            res.sendStatus(204);
        });
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map