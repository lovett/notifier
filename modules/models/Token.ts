import * as crypto from "crypto";
import * as Sequelize from "sequelize";

export default function (sequelize, app) {
    let classMethods, fields;

    fields = {
        key: {
            type: Sequelize.STRING(88),
            allowNull: false,
            validate: {
                len: {
                    args: [1, 88],
                    msg: 'should be between 1 and 88 characters'
                }
            }
        },

        value: {
            type: Sequelize.TEXT,
            allowNull: false,
        },

        label: {
            type: Sequelize.STRING(100),
            allowNull: true,
            validate: {
                len: {
                    args: [1, 100],
                    msg: 'should be between 1 and 100 characters'
                }
            }
        },

        persist: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: false
        }
    };

    classMethods = {
        prune: function (callback) {
            app.locals.Token.destroy({
                where: {
                    persist: false,
                    updatedAt: {
                        lt: new Date(new Date().getTime() - (60 * 60 * 24 * 7 * 1000))
                    }
                }
            }).then(callback);
        },

        generateKeyAndValue: function (callback) {
            let numBytes = 64;

            crypto.randomBytes(numBytes, (err, buf) => {
                let bag, i, result;

                if (err) {
                    process.stderr.write('Error while generating random bytes\n');
                    callback();
                }

                bag = 'abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789';

                result = '';
                for (i=0; i < numBytes; i = i + 1) {
                    result += bag[buf[i] % bag.length];
                }

                callback(result.substring(0, numBytes/2),
                         result.substring(numBytes/2));

            });
        }
    };

    return sequelize.define('Token', fields, {
        'classMethods': classMethods
    });
}
