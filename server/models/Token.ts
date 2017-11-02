import * as Sequelize from 'sequelize';
import { Token, TokenInstance } from '../types/server';

export default function(sequelize: Sequelize.Sequelize): Sequelize.Model<TokenInstance, Token> {

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

    return sequelize.define('Token', fields);
}
