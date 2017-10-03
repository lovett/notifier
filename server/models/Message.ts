import * as Sequelize from 'sequelize';
import * as sanitize from '../validation/sanitize';

export default function(sequelize: Sequelize.Sequelize) {
    const fields: Sequelize.DefineAttributes = {
        body: {
            allowNull: true,
            set(this: Sequelize.Instance<MessageModel>, value: string) {
                this.setDataValue('body', sanitize.tolerantSanitize(value));
            },
            type: Sequelize.STRING(500),
            validate: {
                len: {
                    args: [1, 500],
                    msg: 'should be 1-500 characters long',
                },
            },
        },

        deliveredAt: {
            defaultValue: Sequelize.NOW,
            type: Sequelize.DATE,
        },

        expiresAt: {
            allowNull: true,
            get(this: Sequelize.Instance<MessageModel>): Date|null {
                const value = this.getDataValue('expiresAt');

                if (!value) {
                    return null;
                }

                return new Date(value);
            },
            type: Sequelize.TIME,
        },

        group: {
            allowNull: true,
            defaultValue: 'default',
            set(this: Sequelize.Instance<MessageModel>, value: string) {
                return this.setDataValue('group', sanitize.strictSanitize(value));
            },
            type: Sequelize.STRING(50),
            validate: {
                len: {
                    args: [1, 50],
                    msg: 'should be 1-50 characters long',
                },
            },
        },

        localId: {
            allowNull: true,
            set(this: Sequelize.Instance<MessageModel>, value: string) {
                this.setDataValue('localId', sanitize.strictSanitize(value));
            },
            type: Sequelize.STRING(255),

        },

        publicId: {
            allowNull: false,
            defaultValue: Sequelize.UUIDV4,
            type: Sequelize.UUID,
        },

        pushbulletId: {
            allowNull: true,
            type: Sequelize.STRING(255),
        },

        source: {
            allowNull: true,
            set(this: Sequelize.Instance<MessageModel>, value: string) {
                this.setDataValue('source', sanitize.strictSanitize(value));
            },
            type: Sequelize.STRING(100),
            validate: {
                len: {
                    args: [1, 100],
                    msg: 'should be 1-100 characters long',
                },
            },
        },

        title: {
            allowNull: false,
            type: Sequelize.STRING(255),
            validate: {
                len: {
                    args: [1, 255],
                    msg: 'should be 1-255 characters long',
                },
            },
            set(this: Sequelize.Instance<MessageModel>, value: string) {
                this.setDataValue('title', sanitize.strictSanitize(value));
            },
        },

        unread: {
            allowNull: false,
            defaultValue: true,
            type: Sequelize.BOOLEAN,
        },

        url: {
            allowNull: true,
            set(this: Sequelize.Instance<MessageModel>, value: string) {
                this.setDataValue('url', sanitize.strictSanitize(value));
            },
            type: Sequelize.STRING(255),
            validate: {
                len: {
                    args: [1, 255],
                    msg: 'should be 1-255 characters long',
                },
            },
        },

    };

    return sequelize.define('Message', fields, {
        createdAt: 'received',
        timestamps: true,
        updatedAt: false,
    });
}
