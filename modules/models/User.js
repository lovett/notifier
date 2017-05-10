/* eslint no-invalid-this: 0 */
'use strict';
let Sequelize = require('sequelize'),
    crypto = require('crypto');

function main (sequelize, app) {
    let fields, instanceMethods;

    fields = {
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
    };

    instanceMethods = {
        purgeServiceToken: (service, callback) => {
            if (!service) {
                callback(0);
            }

            app.locals.Token.destroy({
                where: {
                    'UserId': this.id,
                    'label': 'service',
                    'key': service
                }
            }).then((affectedRows) => callback(affectedRows));
        },
        getServiceTokens: function (callback) {
            let user = this;

            user.serviceTokens = {};

            app.locals.Token.findAll({
                where: {
                    'UserId': user.id,
                    'label': 'service'
                },
                attributes: ['key', 'value']
            }).then((tokens) => {
                tokens.forEach((token) => user.serviceTokens[token.key] = token.value);
                callback();
            });
        },

        getChannel: function () {
            let hmac = crypto.createHmac('sha256', app.locals.appsecret);

            hmac.setEncoding('hex');
            hmac.write(this.id.toString());
            hmac.end();

            return hmac.read();
        },

        hashPassword: function (password, callback) {
            let iterations, keyLength, randBytes, self;

            self = this;
            randBytes = app.locals.config.get('NOTIFIER_PASSWORD_HASH_RANDBYTES');
            keyLength = app.locals.config.get('NOTIFIER_PASSWORD_HASH_KEYLENGTH');
            iterations = app.locals.config.get('NOTIFIER_PASSWORD_HASH_ITERATIONS');

            crypto.randomBytes(randBytes, (err, buf) => {
                let salt;

                if (err) {
                    process.stderr.write('Error while generating random bytes\n');
                }

                salt = buf.toString('hex');

                crypto.pbkdf2(password, salt, iterations, keyLength, 'sha1', (err, key) => {
                    self.setDataValue('passwordHash', `${salt}::${key.toString('hex')}`);
                    callback();
                });
            });
        },

        checkPassword: function (password, callback) {
            let iterations, keyLength, segments;

            segments = this.getDataValue('passwordHash').split('::');
            keyLength = app.locals.config.get('NOTIFIER_PASSWORD_HASH_KEYLENGTH');
            iterations = app.locals.config.get('NOTIFIER_PASSWORD_HASH_ITERATIONS');

            crypto.pbkdf2(password, segments[0], iterations, keyLength, 'sha1', (err, key) => {
                callback(key.toString('hex') === segments[1]);
            });
        }
    };

    return sequelize.define('User', fields, {
        'instanceMethods': instanceMethods
    });
}

module.exports = exports = main;
