var express, router;

express = require('express');

router = express.Router();

router.post('/', function (req, res, next) {
    var err, message;

    if (Object.keys(req.body).length === 0) {
        err = new Error('Message is blank');
        err.status = 400;
        next(err);
        return;
    }

    message = res.app.locals.Message.build({
        received: new Date()
    });

    message.attributes.forEach(function (key) {
        var fieldName, parseResult, value;
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
        res.app.locals.Message.findAll({
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

            res.app.locals.Message.update({
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
                        publishMessage(req.user, {
                            'retracted': id
                        });
                    });
                };
            });
            return null;
        });
    }

    message.save().then(function () {
        message.setUser(req.user).then(function () {
            publishMessage(req.user, message);
            res.sendStatus(204);
        });
        return null;
    }).catch(function (error) {
        var err, message = '';
        error.errors.forEach(function (err) {
            message += err.message + ';';
        });

        err = new Error(message);
        err.status = 400;
        next(err);
    });
});

router.patch('/', function (req, res) {
    var err, fields, message;

    fields = ['title', 'url', 'body', 'source', 'group', 'deliveredAt'].reduce(function (acc, field) {
        if (req.body.hasOwnProperty(field)) {
            acc[field] = req.body[field];
        }
        return acc;
    }, {});

    res.app.locals.Message.update(fields, {
        where: {
            'publicId': req.body.publicId,
            'UserId': req.user.id
        }
    }).then(function (affectedRows) {
        if (affectedRows[0] !== 1) {
            res.sendStatus(400);
        }

        app.locals.Message.findOne({
            where: {
                'publicId': req.body.publicId,
                'UserId': req.user.id
            }
        }).then(function (message) {
            publishMessage(req.user, message);
            res.sendStatus(204);
        });
    });
});

module.exports = exports = router;
