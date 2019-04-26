import * as db from '../db';
import { Strategy } from 'passport-local';

export default () => {
    return new Strategy((username, password, done) => {

        (async () => {
            const user = await db.getUser(username);

            if (!user) {
                return done(null, false);
            }

            const validPassword = await user.testPassword(password);

            if (validPassword) {
                return done(null, user);
            }

            return done(null, false);

        })().catch((err) => { throw err; });
    });
};
