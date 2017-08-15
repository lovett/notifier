"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var router = express.Router();
router.get('/', function (req, res) {
    res.type('appcache');
    res.render('appCache');
});
exports.default = router;
//# sourceMappingURL=appcache.js.map