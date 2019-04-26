import * as db from '../db';
import { Strategy as CookieStrategy } from 'passport-cookie';

export default () => {
    return new CookieStrategy((cookieValue, next) => {
        const [key, value] = cookieValue.split(',');

        (async () => {
            const userId = await db.getUserIdByToken(key, value);

            return next(null, userId);
        })().catch((err) => { throw err; });
    });
};
