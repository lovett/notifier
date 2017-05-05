var express, router;

express = require('express');

router = express.Router();

router.post('/', function (req, res) {
    var update = function (id) {
        req.app.locals.Message.update(
            {unread: true},
            {where: {publicId: id}}
        ).then(function (affectedRows) {
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
    } else {
        res.sendStatus(400);
    }
});

module.exports = exports = router;
