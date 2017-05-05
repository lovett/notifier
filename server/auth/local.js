var LocalStrategy = require('passport-local').Strategy;

function main (app) {
    var strategy = new LocalStrategy(function (username, password, done) {
        app.locals.User.find({ where: { username: username } }).then(function (user) {

            if (!user) {
                return done(null, false);
            }

            user.checkPassword(password, function (valid) {
                if (valid) {
                    return done(null, user);
                } else {
                    return done(null, false);
                }
            });
        }, function (error) {
            return done(error);
        });
    });

    return strategy;
}

module.exports = exports = main;
