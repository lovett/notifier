var express, router;

express = require('express');

router = express.Router();

/**
 * The application homepage
 */
router.get('/', function(req, res, next) {
    res.sendFile(res.locals.public_dir + '/index.html');
});

module.exports = exports = router;
