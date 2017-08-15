"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var passport_cookie_1 = require("passport-cookie");
exports.default = function (app) {
    return new passport_cookie_1.Strategy(function (cookieValue, next) {
        var _a = cookieValue.split(','), key = _a[0], value = _a[1];
        app.locals.Token.findOne({
            include: [app.locals.User],
            where: { key: key, value: value },
        }).then(function (token) {
            if (!token) {
                return next(null, false);
            }
            token.User.token = { key: key, value: value };
            return next(null, token.User);
        }).catch(function () {
            next(new Error('Application error'));
        });
    });
};
//# sourceMappingURL=cookie.js.map