import * as crypto from 'crypto';
import * as express from 'express';
import * as Sequelize from 'sequelize';

export type PruneCallback = () => void;

export type GenerateCallback = (key: string|null, value: string|null) => void;

export interface ITokenAttributes {
    key: string;
    label?: string;
    persist: boolean;
    value: string;
}

export interface ITokenInstance extends Sequelize.Instance<ITokenAttributes> {
    prune: PruneCallback;
    generateKeyAndValue: GenerateCallback;
}

export default function(sequelize: Sequelize.Sequelize, app: express.Application): Sequelize.Model<ITokenInstance, ITokenAttributes> {

    const fields: Sequelize.DefineAttributes = {
        key: {
            allowNull: false,
            type: Sequelize.STRING(88),
            validate: {
                len: {
                    args: [1, 88],
                    msg: 'should be between 1 and 88 characters',
                },
            },
        },

        label: {
            allowNull: true,
            type: Sequelize.STRING(100),
            validate: {
                len: {
                    args: [1, 100],
                    msg: 'should be between 1 and 100 characters',
                },
            },
        },

        persist: {
            allowNull: false,
            defaultValue: false,
            type: Sequelize.BOOLEAN,
        },

        value: {
            allowNull: false,
            type: Sequelize.TEXT,
        },

    };

    const options: Sequelize.DefineOptions<ITokenInstance> = {
        classMethods: {
            prune(callback: PruneCallback) {
                app.locals.Token.destroy({
                    where: {
                        persist: false,
                        updatedAt: {
                            lt: new Date(new Date().getTime() - (60 * 60 * 24 * 7 * 1000)),
                        },
                    },
                }).then(callback);
            },

            generateKeyAndValue(callback: GenerateCallback) {
                const numBytes = 64;

                crypto.randomBytes(numBytes, (err, buf) => {
                    if (err) {
                        process.stderr.write('Error while generating random bytes\n');
                        callback(null, null);
                    }

                    const bag = 'abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789';

                    let result = '';
                    for (let i = 0; i < numBytes; i = i + 1) {
                        result += bag[buf[i] % bag.length];
                    }

                    callback(
                        result.substring(0, numBytes / 2),
                        result.substring(numBytes / 2)
                    );

                });
            },
        },
    };

    return sequelize.define('Token', fields, options);
}
