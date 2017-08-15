"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(req, res, next, value) {
    var count;
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
//# sourceMappingURL=count.js.map