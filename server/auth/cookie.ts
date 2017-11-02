import * as express from 'express';
import {Strategy as CookieStrategy} from 'passport-cookie';
import { TokenInstance } from '../types/server';

export default (app: express.Application) => {
    return new CookieStrategy((cookieValue, next) => {
        const [key, value] = cookieValue.split(',');


        app.locals.Token.findOne({
            include: [ app.locals.User],
            where: {key, value},
        }).then((token: TokenInstance) => {
            if (!token) {
                return next(null, false);
            }

            token!.User.token = {key, value};

            return next(null, token.User);
        }).catch(() => {
            next(new Error('Application error'));
        });
    });
};
