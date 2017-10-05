import * as express from 'express';
import {Strategy as LocalStrategy} from 'passport-local';
import { UserInstance } from '../../types/server';

export default (app: express.Application) => {
    return new LocalStrategy((username, password, done) => {
        app.locals.User.find({ where: { username } }).then((user: UserInstance) => {
            if (!user) {
                return done(null, false);
            }

            user.checkPassword(password, (valid) => {
                if (valid) {
                    return done(null, user);
                } else {
                    return done(null, false);
                }
            });
        }).catch((error: Error) => done(error));
    });
};
