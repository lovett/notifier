import * as Sequelize from "sequelize";
import * as sanitize from "../validation/sanitize";

export default function (sequelize) {
    let fields;

    fields = {
        publicId: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            allowNull: false
        },

        localId: {
            type: Sequelize.STRING(255),
            allowNull: true,
            set: function (value) {
                return this.setDataValue('localId', sanitize.strictSanitize(value));
            }
        },

        pushbulletId: {
            type: Sequelize.STRING(255),
            allowNull: true
        },

        title: {
            type: Sequelize.STRING(255),
            allowNull: false,
            validate: {
                len: {
                    args: [1, 255],
                    msg: 'should be 1-255 characters long'
                }
            },
            set: function (value) {
                return this.setDataValue('title', sanitize.strictSanitize(value));
            }
        },

        url: {
            type: Sequelize.STRING(255),
            allowNull: true,
            validate: {
                len: {
                    args: [1, 255],
                    msg: 'should be 1-255 characters long'
                }
            },
            set: function (value) {
                return this.setDataValue('url', sanitize.strictSanitize(value));
            }
        },

        body: {
            type: Sequelize.STRING(500),
            allowNull: true,
            validate: {
                len: {
                    args: [1, 500],
                    msg: 'should be 1-500 characters long'
                }
            },
            set: function (value) {
                return this.setDataValue('body', sanitize.tolerantSanitize(value));
            }
        },

        source: {
            type: Sequelize.STRING(100),
            allowNull: true,
            validate: {
                len: {
                    args: [1, 100],
                    msg: 'should be 1-100 characters long'
                }
            },
            set: function (value) {
                return this.setDataValue('source', sanitize.strictSanitize(value));
            }
        },

        group: {
            type: Sequelize.STRING(50),
            allowNull: true,
            defaultValue: 'default',
            validate: {
                len: {
                    args: [1,50],
                    msg: 'should be 1-50 characters long'
                }
            },
            set: function (value) {
                return this.setDataValue('group', sanitize.strictSanitize(value));
            }
        },

        unread: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },

        deliveredAt: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        },

        expiresAt: {
            type: Sequelize.TIME,
            allowNull: true,
            get: function () {
                let value = this.getDataValue('expiresAt');

                if (!value) return null;

                return new Date(value);
            }
        }
    };

    return sequelize.define('Message', fields, {
        'timestamps': true,
        'updatedAt': false,
        'createdAt': 'received'
    });
}
