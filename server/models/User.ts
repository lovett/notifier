import * as crypto from 'crypto';
import * as Sequelize from 'sequelize';

export default (sequelize, app) => {
    const hasher = (instance, options, done) => {
        const randBytes = app.locals.config.get('NOTIFIER_PASSWORD_HASH_RANDBYTES');
        const keyLength = app.locals.config.get('NOTIFIER_PASSWORD_HASH_KEYLENGTH');
        const iterations = app.locals.config.get('NOTIFIER_PASSWORD_HASH_ITERATIONS');

        crypto.randomBytes(randBytes, (err, buf) => {
            if (err) {
                throw err;
            }

            const salt = buf.toString('hex');

            crypto.pbkdf2(instance.get('passwordHash'), salt, iterations, keyLength, 'sha1', (err2, key) => {
                if (err2) {
                    throw err2;
                }

                instance.set('passwordHash', `${salt}::${key.toString('hex')}`);
                done();
            });
        });
    };

    const fields = {
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

    const model = sequelize.define('User', fields, {
        hooks: {
            beforeCreate: hasher,
            beforeUpdate: hasher,
        },
    });

    model.prototype.purgeServiceToken = function(service, callback) {
        const user = this;

        if (!service) {
            callback(0);
        }

        app.locals.Token.destroy({
            where: {
                UserId: user.id,
                key: service,
                label: 'service',
            },
        }).then((affectedRows) => callback(affectedRows));
    };


    model.prototype.getServiceTokens = function(callback) {
        const user = this;

        user.serviceTokens = {};
        app.locals.Token.findAll({
            attributes: ['key', 'value', 'label'],
            where: {
                UserId: user.id,
                label: {
                    $in: ['service', 'userval'],
                },
            },
        }).then((tokens) => {
            user.serviceTokens = tokens.map((token) => {
                return token.dataValues;
            });
            callback();
        });
    };

    model.prototype.checkPassword = function(password, callback) {
        const user = this;

        const segments = user.getDataValue('passwordHash').split('::');
        const keyLength = app.locals.config.get('NOTIFIER_PASSWORD_HASH_KEYLENGTH');
        const iterations = app.locals.config.get('NOTIFIER_PASSWORD_HASH_ITERATIONS');
        crypto.pbkdf2(password, segments[0], iterations, keyLength, 'sha1', (err, key) => {
            callback(key.toString('hex') === segments[1]);
        });
    };

    return model;
};
