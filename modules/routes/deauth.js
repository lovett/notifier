let express, router;

express = require('express');

router = express.Router();

/**
 * Remove a access token
 *
 * This is the destructive counterpart to /auth
 */
router.post('/', function(req, res) {
    let params = {
        where: {
            value: req.user.token.value
        }
    };

    req.app.locals.Token.destroy(params)
        .then(() => res.sendStatus(200));
});

module.exports = exports = router;
