"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto = require("crypto");
function randomString(len) {
    var randomBytes;
    randomBytes = crypto.randomBytes(Math.ceil(len / 2));
    return randomBytes.toString('hex').slice(0, len);
}
function default_1(app) {
    var filter, password, username;
    var DEFAULT_USER_ID = 1;
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
    app.locals.User.findOne(filter).then(function (user) {
        if (user) {
            return;
        }
        app.locals.User.create({
            id: DEFAULT_USER_ID,
            username: username,
            passwordHash: password
        }).then(function (user) {
            process.stdout.write('Created a default user:\n');
            process.stdout.write("- Username: " + user.username + "\n");
            process.stdout.write("- Password: " + password + "\n");
        });
    });
}
exports.default = default_1;
//# sourceMappingURL=create-user.js.map