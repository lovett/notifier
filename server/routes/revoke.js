let express, router;

express = require('express');

router = express.Router();

router.post('/', function (req, res) {
    let statusCodeByDeletionCount = (count) => {
        if (count === 0) {
            res.sendStatus(500);
            return;
        }
        res.sendStatus(200);
    };

    req.user.purgeServiceToken(req.body.service, statusCodeByDeletionCount);
});

module.exports = exports = router;
