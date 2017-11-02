"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Validate a numeric string as a number between 1 and 100
 */
function default_1(req, res, next, value) {
    let count;
    if (/\D/.test(value) === true) {
        res.status(400);
        return next(new Error('Invalid count'));
    }
    count = parseInt(value, 10);
    count = Math.min(count, 100);
    count = Math.max(count, 1);
    req.params.count = count;
    next();
}
exports.default = default_1;
