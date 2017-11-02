import * as express from 'express';
import {BasicStrategy} from 'passport-http';
import { TokenInstance } from '../types/server';

export default function(app: express.Application) {
    return new BasicStrategy((key, value, next) => {

        app.locals.Token.findOne({
            include: [ app.locals.User],
            where: {
                value,
            },
        }).then((token: TokenInstance) => {
            if (!token || token.key !== key) {
                return next(null, false);
            }

            token.User.token = {
                key,
                value,
            };

            return next(null, token.User);
        }).catch(() => {
            next(new Error('Application error'));
        });
    });
}
