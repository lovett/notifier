import * as db from '../db';
import { BasicStrategy } from 'passport-http';

export default function() {
    return new BasicStrategy((key, value, next) => {

        (async () => {
            const userId = db.getTokenUser(key, value);

            return next(null, userId);
        })();
    });
}
