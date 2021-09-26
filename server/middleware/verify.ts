import db from '../db';
import Token from '../Token';
import { NextFunction, Request, Response } from 'express';
import { CookieOptions } from 'express-serve-static-core'

/**
 * Identify a user based on cookie or basic auth.
 */
export default async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let user;

    if ('token' in req.cookies) {
        const [key, value] = req.cookies.token.split(',', 2);
        user = await db.getUserByToken(key, value);

        if (user) {
            const token = user.token as Token;
            if (token.persist) {
                await db.markTokenSeen(token);

                const cookieOptions: CookieOptions = {
                    path: req.app.locals.config.get('NOTIFIER_BASE_URL'),
                    sameSite: 'strict',
                    expires: new Date(Date.now() + (86400000 * 30))
                }

                res.cookie('token', `${token.key},${token.value}`, cookieOptions);
            }

            req.user = user;
            return next();
        }

        if (req.headers['accept'] && req.headers['accept'].indexOf('text/event-stream') === -1) {
            res.sendStatus(403);
        } else {
            res.writeHead(200, {
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'Content-Type': 'text/event-stream',
                'X-Accel-Buffering': 'no'
            });
            res.write(`event: message\ndata: 403\n\n`);
        }
        return;
    }

    if ('authorization' in req.headers) {
        const authHeader = req.headers.authorization as string;

        const [authType, credential] = authHeader.split(' ', 2);

        if (authType.toLowerCase() === 'basic') {
            const [authUser, authPass] = Buffer.from(
                credential, 'base64'
            ).toString().split(':', 2);

            user = await db.getUserByToken(authUser, authPass);

            if (user) {
                const token = user.token as Token;
                await db.markTokenSeen(token);
                req.user = user;
                return next();
            }
        }

        res.sendStatus(403);
        return;
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="notifier"');
    res.sendStatus(401);
};
