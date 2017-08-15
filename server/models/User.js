"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto = require("crypto");
var Sequelize = require("sequelize");
exports.default = function (sequelize, app) {
    var hasher = function (instance, options, done) {
        var randBytes = app.locals.config.get('NOTIFIER_PASSWORD_HASH_RANDBYTES');
        var keyLength = app.locals.config.get('NOTIFIER_PASSWORD_HASH_KEYLENGTH');
        var iterations = app.locals.config.get('NOTIFIER_PASSWORD_HASH_ITERATIONS');
        crypto.randomBytes(randBytes, function (err, buf) {
            if (err) {
                throw err;
            }
            var salt = buf.toString('hex');
            crypto.pbkdf2(instance.get('passwordHash'), salt, iterations, keyLength, 'sha1', function (err2, key) {
                if (err2) {
                    throw err2;
                }
                instance.set('passwordHash', salt + "::" + key.toString('hex'));
                done();
            });
        });
    };
    var fields = {
        passwordHash: {
            allowNull: false,
            type: Sequelize.STRING(258),
            validate: {
                len: {
                    args: [1, 258],
                    msg: 'should be between 1 and 258 characters',
                },
            },
        },
        username: {
            allowNull: false,
            type: Sequelize.STRING(20),
            unique: true,
            validate: {
                len: {
                    args: [1, 20],
                    msg: 'should be between 1 and 20 characters',
                },
            },
        },
    };
    var model = sequelize.define('User', fields, {
        hooks: {
            beforeCreate: hasher,
            beforeUpdate: hasher,
        },
    });
    model.prototype.purgeServiceToken = function (service, callback) {
        var user = this;
        if (!service) {
            callback(0);
        }
        app.locals.Token.destroy({
            where: {
                UserId: user.id,
                key: service,
                label: 'service',
            },
        }).then(function (affectedRows) { return callback(affectedRows); });
    };
    model.prototype.getServiceTokens = function (callback) {
        var user = this;
        user.serviceTokens = {};
        app.locals.Token.findAll({
            attributes: ['key', 'value', 'label'],
            where: {
                UserId: user.id,
                label: {
                    $in: ['service', 'userval'],
                },
            },
        }).then(function (tokens) {
            user.serviceTokens = tokens.map(function (token) {
                return token.dataValues;
            });
            callback();
        });
    };
    model.prototype.checkPassword = function (password, callback) {
        var user = this;
        var segments = user.getDataValue('passwordHash').split('::');
        var keyLength = app.locals.config.get('NOTIFIER_PASSWORD_HASH_KEYLENGTH');
        var iterations = app.locals.config.get('NOTIFIER_PASSWORD_HASH_ITERATIONS');
        crypto.pbkdf2(password, segments[0], iterations, keyLength, 'sha1', function (err, key) {
            callback(key.toString('hex') === segments[1]);
        });
    };
    return model;
};
//# sourceMappingURL=User.js.map