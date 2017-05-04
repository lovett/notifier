var Message = require('./Message'),
    Sequelize = require('sequelize'),
    Token = require('./Token'),
    crypto = require('crypto'),
    sanitize =  require('../validation/sanitize');

function main (sequelize, app) {
    var model;

    model = sequelize.define('User', {
        username: {
            type: Sequelize.STRING(20),
            unique: true,
            allowNull: false,
            validate: {
                len: {
                    args: [1, 20],
                    msg: 'should be between 1 and 20 characters'
                }
            }
        },

        passwordHash: {
            type: Sequelize.STRING(258),
            allowNull: true,
            validate: {
                len: {
                    args: [1, 258],
                    msg: 'should be between 1 and 258 characters'
                }
            }
        }
    }, {
        instanceMethods: {
            purgeServiceToken: function (service, callback) {
                if (!service) {
                    callback(0);
                }

                app.locals.Token.destroy({
                    where: {
                        'UserId': this.id,
                        'label': 'service',
                        'key': service
                    }
                }).then(function (affectedRows) {
                    callback(affectedRows);
                });
            },
            getServiceTokens: function (callback) {
                var user = this;
                user.serviceTokens = {};

                Token.findAll({
                    where: {
                        'UserId': user.id,
                        'label': 'service'
                    },
                    attributes: ['key', 'value']
                }).then(function (tokens) {
                    tokens.forEach(function (token) {
                        user.serviceTokens[token.key] = token.value;
                    });
                    callback();
                });
            },

            getChannel: function () {
                var hmac = crypto.createHmac('sha256', app.locals.appsecret);
                hmac.setEncoding('hex');
                hmac.write(this.id.toString());
                hmac.end();
                return hmac.read();
            },

            hashPassword: function (password, callback) {
                var iterations, keyLength, randBytes, self;
                self = this;
                randBytes = app.locals.config.get('NOTIFIER_PASSWORD_HASH_RANDBYTES');
                keyLength = app.locals.config.get('NOTIFIER_PASSWORD_HASH_KEYLENGTH');
                iterations = app.locals.config.get('NOTIFIER_PASSWORD_HASH_ITERATIONS');

                crypto.randomBytes(randBytes, function(err, buf) {
                    var salt;
                    if (err) {
                        console.error({err: err}, 'error while generating random bytes');
                    }

                    salt = buf.toString('hex');

                    crypto.pbkdf2(password, salt, iterations, keyLength, 'sha1', function (err, key) {
                        self.setDataValue('passwordHash', util.format('%s::%s', salt, key.toString('hex')));
                        callback();
                    });
                });
            },

            checkPassword: function (password, callback) {
                var iterations, keyLength, segments;
                segments = this.getDataValue('passwordHash').split('::');
                keyLength = app.locals.config.get('NOTIFIER_PASSWORD_HASH_KEYLENGTH');
                iterations = app.locals.config.get('NOTIFIER_PASSWORD_HASH_ITERATIONS');

                crypto.pbkdf2(password, segments[0], iterations, keyLength, 'sha1', function (err, key) {
                    callback(key.toString('hex') === segments[1]);
                });
            }
        }
    });

    return model;
}

module.exports = exports = main;
