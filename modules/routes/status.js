var express, router;

express = require('express');

router = express.Router();

/**
 * A static are-you-alive endpoint for monitoring and keep-alive
 */
router.get('/', function(req, res, next) {
    res.type('txt');
    res.send('OK');
});

module.exports = exports = router;
