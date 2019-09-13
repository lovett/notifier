import * as db from '../db';
import { Strategy } from 'passport-cookie';

export default () => {
    return new Strategy((cookieValue, next) => {
        const [key, value] = cookieValue.split(',');

        (async () => {
            const user = await db.getUserByToken(key, value);

            return next(null, user);
        })().catch((err) => { throw err; });
    });
};
