'use strict';

let main = (app) => {
    let password, username;

    username = app.locals.config.get('NOTIFIER_DEFAULT_USER');
    password = app.locals.config.get('NOTIFIER_DEFAULT_PASSWORD');

    if (!username || !password) {
        return false;
    }

    /*
    app.locals.User.findOrCreate({ where: {username: username}}).spread((user, created) => {

        if (created) {
            user.hashPassword(password, () => {
                user.save().then(() => {
                    callback();
                }, function (err) {
                    callback(err);
                });
            });
        }
    }, function (err) {
        callback(err);
    });*/
};

module.exports = exports = main;
