import * as db from '../db';
import { Strategy } from 'passport-cookie';

export default (): Strategy => {
    return new Strategy((cookieValue, next) => {
        const [key, value] = cookieValue.split(',');

        (async (): Promise<void> => {
            const user = await db.getUserByToken(key, value);

            next(null, user);
        })().catch((err: Error) => { throw err; });
    });
};
