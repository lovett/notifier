import db from '../db';
import { NextFunction, Request, Response } from 'express';

/**
 * Identify a user based on cookie or basic auth.
 */
export default async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let user;

    if ('token' in req.cookies) {
        const [key, value] = req.cookies.token.split(',', 2);
        user = await db.getUserByToken(key, value);
    }

    if (user) {
        req.user = user;
        return next();
    }

    if ('authorization' in req.headers) {
        const authHeader = req.headers.authorization as string;

        const [authType, credential] = authHeader.split(' ', 2);

        if (authType.toLowerCase() === 'basic') {
            const [authUser, authPass] = Buffer.from(
                credential, 'base64'
            ).toString().split(':', 1);

            user = await db.getUserByToken(authUser, authPass);
        }
    }

    if (user) {
        req.user = user;
        return next();
    }

    res.sendStatus(401);
};
