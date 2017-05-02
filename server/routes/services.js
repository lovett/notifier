let express, passport, router;

express = require('express');

router = express.Router();

/**
 * Return a list of the additonal functionality the user has opted into
 *
 * Services can be third-party integrations, or application-local
 * functionality. Anything that can be toggled on or off.
 *
 * Client-specific functionality is not included. In particular:
 * browser notifications.
 */
router.get('/', function(req, res, next) {
    let tokenKeysToJson = () => res.json(Object.keys(req.user.serviceTokens));

    req.user.getServiceTokens(tokenKeysToJson);
});

module.exports = exports = router;
