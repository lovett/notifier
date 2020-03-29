import * as db from '../db';
import { Strategy } from 'passport-local';

export default (): Strategy => {
    return new Strategy((username, password, done) => {

        (async (): Promise<void> => {
            const user = await db.getUser(username);

            if (user) {
                const validPassword = await user.testPassword(password);

                if (validPassword) {
                    done(null, user);
                }
            }

            done(null, null);

        })().catch((err: Error) => { throw err; });
    });
};
