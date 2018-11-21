import * as crypto from 'crypto';
import * as express from 'express';
import {Strategy as LocalStrategy} from 'passport-local';
import { UserInstance } from '../types/server';

export default (app: express.Application) => {
    return new LocalStrategy((username, password, done) => {
        app.locals.User.findOne({ where: { username } }).then((user: UserInstance) => {
            if (!user) {
                return done(null, false);
            }

            const segments = user.getDataValue('passwordHash').split('::');

            const keyLength = app.locals.config.get('NOTIFIER_PASSWORD_HASH_KEYLENGTH');

            const iterations = app.locals.config.get('NOTIFIER_PASSWORD_HASH_ITERATIONS');

            crypto.pbkdf2(password, segments[0], iterations, keyLength, 'sha1', (_, key) => {
                if (key.toString('hex') === segments[1]) {
                    return done(null, user);
                } else {
                    return done(null, false);
                }
            });
        }).catch((error: Error) => done(error));
    });
};
