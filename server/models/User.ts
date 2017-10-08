import * as crypto from 'crypto';
import * as express from 'express';
import * as Sequelize from 'sequelize';
import { TokenInstance, UserInstance } from '../../types/server';

export default function(sequelize: Sequelize.Sequelize, app: express.Application) {

    const hasher = (instance: UserInstance, _: any, done: () => void) => {
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

    const fields: Sequelize.DefineAttributes = {
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

    const options: Sequelize.DefineOptions<UserInstance> = {
        classMethods: {
            purgeServiceToken(this: UserInstance, service: string, callback: (affectedRows: number) => void) {
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
                }).then((affectedRows: number) => callback(affectedRows));
            },
            getServiceTokens(this: UserInstance, callback: () => void) {
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
                }).then((tokens: TokenInstance[]) => {
                    user.serviceTokens = tokens.map((token) => {
                        return token.dataValues;
                    });
                    callback();
                });
            },

            checkPassword(this: UserInstance, password: string, callback: (result: boolean) => void) {
                const user = this;

                const segments = user.getDataValue('passwordHash').split('::');
                const keyLength = app.locals.config.get('NOTIFIER_PASSWORD_HASH_KEYLENGTH');
                const iterations = app.locals.config.get('NOTIFIER_PASSWORD_HASH_ITERATIONS');
                crypto.pbkdf2(password, segments[0], iterations, keyLength, 'sha1', (_, key) => {
                    callback(key.toString('hex') === segments[1]);
                });
            },
        },

        hooks: {
            beforeCreate: hasher,
            beforeUpdate: hasher,
        },
    };

    return sequelize.define('User', fields, options);
}
