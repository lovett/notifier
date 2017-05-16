/* eslint no-invalid-this: 0 */
'use strict';
let Sequelize = require('sequelize'),
    crypto = require('crypto');

function main (sequelize, app) {
    let fields, hasher, instanceMethods;

    hasher = (instance, options, done) => {
        let iterations, keyLength, randBytes;

        randBytes = app.locals.config.get('NOTIFIER_PASSWORD_HASH_RANDBYTES');
        keyLength = app.locals.config.get('NOTIFIER_PASSWORD_HASH_KEYLENGTH');
        iterations = app.locals.config.get('NOTIFIER_PASSWORD_HASH_ITERATIONS');

        crypto.randomBytes(randBytes, (err, buf) => {
            let salt;

            if (err) throw err;

            salt = buf.toString('hex');

            crypto.pbkdf2(instance.get('passwordHash'), salt, iterations, keyLength, 'sha1', (err, key) => {
                if (err) throw err;
                instance.set('passwordHash', `${salt}::${key.toString('hex')}`);
                done();
            });
        });
    };

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
            allowNull: false,
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
        'instanceMethods': instanceMethods,
        'hooks': {
            'beforeCreate': hasher,
            'beforeUpdate': hasher
        }
    });
}

module.exports = exports = main;
