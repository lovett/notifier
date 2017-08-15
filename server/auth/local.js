"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var passport_local_1 = require("passport-local");
exports.default = function (app) {
    return new passport_local_1.Strategy(function (username, password, done) {
        app.locals.User.find({ where: { username: username } }).then(function (user) {
            if (!user) {
                return done(null, false);
            }
            user.checkPassword(password, function (valid) {
                if (valid) {
                    return done(null, user);
                }
                else {
                    return done(null, false);
                }
            });
        }).catch(function (error) { return done(error); });
    });
};
//# sourceMappingURL=local.js.map