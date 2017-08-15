"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
exports.default = function (publicDir) {
    return express.static(publicDir, {
        setHeaders: function (res) {
            res.set('Cache-Control', 'no-cache, private');
        },
        etag: false,
    });
};
//# sourceMappingURL=asset.js.map