'use strict';
let express, publishMessage, router;

express = require('express');
publishMessage = require('../../helpers/publish-message');

router = express.Router();

router.post('/', (req, res) => {

    let update = function (id) {
        req.app.locals.Message.update(
            {unread: false},
            {where: {publicId: id}}
        ).then((affectedRows) => {
            if (affectedRows[0] === 0) {
                res.sendStatus(400);

                return;
            }

            publishMessage(req.app, req.user, {
                'retracted': id
            });
            res.sendStatus(204);

            return true;
        }).catch(() => res.sendStatus(500));
    };

    if (req.body.hasOwnProperty('publicId')) {
        update(req.body.publicId);
    } else if (req.body.hasOwnProperty('localId')) {
        req.app.locals.Message.find({
            where: {
                localId: req.body.localId,
                unread: true
            },
            limit: 1
        }).then((message) => {
            if (!message) {
                res.sendStatus(400);
            } else {
                update(message.publicId);
            }
        });
    } else {
        res.sendStatus(400);
    }

});

module.exports = exports = router;
