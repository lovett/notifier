'use strict';
let express, router;

express = require('express');

router = express.Router();

router.get('/', (req, res) => {
    res.type('appcache');
    res.render('appCache');
});

module.exports = exports = router;
