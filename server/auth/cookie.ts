import * as db from '../db';
import { Strategy } from 'passport-cookie';

export default () => {
    return new Strategy((cookieValue, next) => {
        const [key, value] = cookieValue.split(',');

        (async () => {
            const userId = await db.getUserIdByToken(key, value);

            return next(null, userId);
        })().catch((err) => { throw err; });
    });
};
