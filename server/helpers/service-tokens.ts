import * as express from 'express';
import * as Sequelize from 'sequelize';
import { TokenInstance, UserInstance } from '../types/server';

export default function(app: express.Application, user: UserInstance, callback: (tokens: TokenInstance[]) => void) {
    app.locals.Token.findAll({
        attributes: ['key', 'value', 'label'],
        where: {
            UserId: user.id,
            label: {
                [Sequelize.Op.in]: ['service', 'userval'],
            },
        },
    }).then((tokens: TokenInstance[]) => {
        callback(tokens);
    });
}
