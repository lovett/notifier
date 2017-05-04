var Sequelize = require('sequelize'),
    User = require('./User');

function main (sequelize, app) {
    var model;

    model = sequelize.define('Token', {
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
    }, {
        classMethods: {
            prune: function (callback) {
                Token.destroy({
                    where: {
                        persist: false,
                        updatedAt: {
                            lt: new Date(new Date().getTime() - (60 * 60 * 24 * 7 * 1000))
                        }
                    }
                }).then(function () {
                    callback();
                });
            },

            generateKeyAndValue: function (callback) {
                var numBytes = 64;
                crypto.randomBytes(numBytes, function(err, buf) {
                    var bag, i, result;

                    if (err) {
                        console.error({err: err}, 'error while generating random bytes');
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
        }
    });

    return model;
}


module.exports = exports = main;
