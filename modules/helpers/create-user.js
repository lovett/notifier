'use strict';

let crypto = require('crypto');

function randomString (len) {
    let randomBytes;

    randomBytes = crypto.randomBytes(Math.ceil(len/2));

    return randomBytes.toString('hex').slice(0,len);
}

function main (app) {
    let filter, password, username;

    const DEFAULT_USER_ID = 1;

    username = app.locals.config.get('NOTIFIER_DEFAULT_USER');
    password = app.locals.config.get('NOTIFIER_DEFAULT_PASSWORD');

    if (!username) {
        username = randomString(6);
    }

    if (!password) {
        password = randomString(12);
    }

    filter = {
        where: {
            id: DEFAULT_USER_ID
        }
    };

    app.locals.User.findOne(filter).then(user => {
        if (user) {
            process.stdout.write('Default user already exists\n');

            return;
        }

        user = app.locals.User.create({
            id: DEFAULT_USER_ID,
            username: username,
            passwordHash: password
        });

        process.stdout.write('Created a default user:\n');
        process.stdout.write(`- Username: ${username}\n`);
        process.stdout.write(`- Password: ${password}\n`);
    });
}

module.exports = exports = main;
