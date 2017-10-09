import * as crypto from 'crypto';
import * as express from 'express';
import * as Sequelize from 'sequelize';
import { UserInstance } from '../../types/server';

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
        hooks: {
            beforeCreate: hasher,
            beforeUpdate: hasher,
        },
    };


    const UserModel = sequelize.define('User', fields, options);

    return UserModel;
}
