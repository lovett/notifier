var BasicStrategy = require('passport-http').BasicStrategy;

function main (app) {
    var strategy = new BasicStrategy(function (key, value, next) {
        var err;
        app.locals.Token.find({
            include: [ app.locals.User],
            where: {
                value: value
            }
        }).then(function (token) {
            err = new Error('Invalid token');
            err.status = 401;

            if (!token) {
                next(err);
                return;
            }

            if (token.key !== key) {
                next(err);
                return;
            }

            token.User.token = {
                key: key,
                value: value
            };

            next(null, token.User);
            return true;
        }).catch(function () {
            err = new Error('Application error');
            err.status = 500;
            next(err);
            return;
        });
    });

    return strategy;
}

module.exports = exports = main;
