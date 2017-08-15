"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var router = express.Router();
router.get('/', function (req, res, next) {
    res.type('txt');
    res.send('OK');
});
exports.default = router;
//# sourceMappingURL=status.js.map