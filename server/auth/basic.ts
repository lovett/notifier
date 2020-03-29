import * as db from '../db';
import { BasicStrategy } from 'passport-http';

export default function(): BasicStrategy {
    return new BasicStrategy((key, value, next) => {

        (async (): Promise<void> => {
            const user = await db.getUserByToken(key, value);

            next(null, user);
        })().catch((err: Error) => { throw err; });
    });
}
