'use strict';
let BasicStrategy = require('passport-http').BasicStrategy;

function main (app) {
    return new BasicStrategy((key, value, next) => {
        let err;

        app.locals.Token.find({
            include: [ app.locals.User],
            where: {
                value: value
            }
        }).then((token) => {
            err = new Error('Invalid token');

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
        }).catch(() => {
            err = new Error('Application error');
            next(err);
        });
    });
}

module.exports = exports = main;
