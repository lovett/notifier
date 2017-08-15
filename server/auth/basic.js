"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var passport_http_1 = require("passport-http");
function default_1(app) {
    return new passport_http_1.BasicStrategy(function (key, value, next) {
        app.locals.Token.findOne({
            include: [app.locals.User],
            where: {
                value: value
            }
        }).then(function (token) {
            if (!token || token.key !== key) {
                return next(null, false);
            }
            token.User.token = {
                key: key,
                value: value
            };
            return next(null, token.User);
        }).catch(function () {
            next(new Error('Application error'));
        });
    });
}
exports.default = default_1;
//# sourceMappingURL=basic.js.map