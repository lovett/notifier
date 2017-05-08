'use strict';
let dateparser, express, publishMessage, router;

dateparser = require('dateparser');
express = require('express');
publishMessage = require('../../helpers/publish-message');

router = express.Router();

router.post('/', (req, res, next) => {
    let err, message;

    if (Object.keys(req.body).length === 0) {
        err = new Error('Message is blank');
        res.status(400);

        return next(err);
    }

    message = req.app.locals.Message.build({
        received: new Date()
    });

    message.attributes.forEach((key) => {
        let fieldName, parseResult;

        if (key === 'id' || key === 'publicId') {
            return;
        }

        if (key === 'expiresAt') {
            fieldName = 'expiration';
        } else {
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

    // Retract unread messages with the same local id as the incoming
    // message. This enforces uniqueness from the client's
    // perspective. From the perspective of the database, localIds are
    // not unique.
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
        }).then((existingMessages) => {
            let ids;

            if (existingMessages.length == 0) {
                return;
            }

            ids = existingMessages.map((existingMessage) => {
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
            }).then((updatedRows) => {
                if (updatedRows[0] > 0) {
                    ids.forEach((id) => {
                        publishMessage(req.app, req.user, {
                            'retracted': id
                        });
                    });
                }
            });

            return null;
        });
    }

    message.save().then(() => {
        message.setUser(req.user).then(() => {
            publishMessage(req.user, message);
            res.sendStatus(204);
        });
    }).catch((error) => {
        let err, message = '';

        error.errors.forEach((err) => {
            message += err.message + ';';
        });

        err = new Error(message);
        res.status(400);
        next(err);
    });
});

router.patch('/', (req, res) => {
    let fields;

    fields = ['title', 'url', 'body', 'source', 'group', 'deliveredAt'].reduce((acc, field) => {
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
    }).then((affectedRows) => {
        if (affectedRows[0] !== 1) {
            res.sendStatus(400);
        }

        req.app.locals.Message.findOne({
            where: {
                'publicId': req.body.publicId,
                'UserId': req.user.id
            }
        }).then((message) => {
            publishMessage(req.user, message);
            res.sendStatus(204);
        });
    });
});

module.exports = exports = router;
