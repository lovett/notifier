import db from '../db';
import type Token from '../Token';
import type User from '../User';
import type { NextFunction, Request, Response } from 'express';
import type { CookieOptions } from 'express-serve-static-core';

/**
 * Identify a user based on cookie or basic auth.
 */
export default async (req: Request, res: Response, next: NextFunction) => {
    let user: User | null = null;

    if ('token' in req.cookies) {
        const [key, value] = req.cookies.token.split(',', 2);
        const user = await db.getUserByToken(key, value);

        if (user) {
            const token = user.token as Token;
            if (token.persist) {
                await db.markTokenSeen(token);

                const cookieOptions: CookieOptions = {
                    path: req.app.locals.config.NOTIFIER_BASE_URL,
                    sameSite: 'strict',
                    expires: new Date(Date.now() + 86400000 * 30),
                };

                res.cookie(
                    'token',
                    `${token.key},${token.value}`,
                    cookieOptions,
                );
            }

            req.user = user;
            next();
            return;
        }

        if (req.headers.accept?.indexOf('text/event-stream') === -1) {
            res.sendStatus(403);
        } else {
            res.writeHead(200, {
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'Content-Type': 'text/event-stream',
                'X-Accel-Buffering': 'no',
            });
            res.write('event: message\ndata: 403\n\n');
        }
        return;
    }

    if ('authorization' in req.headers) {
        const authHeader = req.headers.authorization as string;
        const trustedIps = req.app.locals.config.NOTIFIER_TRUSTED_IPS
            .split(/\s*,\s*/)
            .filter(ip => ip.length > 0);

        const [authType, credential] = authHeader.split(' ', 2);

        if (credential && authType && authType.toLowerCase() === 'basic') {
            const [authUser, authPass] = Buffer.from(credential, 'base64')
                .toString()
                .split(':', 2);

            if (authUser && authPass) {
                if (authUser === authPass) {
                    for (const candidate of trustedIps) {
                        if (req.ip?.startsWith(candidate)) {
                            user = await db.getUser(authUser);
                            break;
                        }
                    }
                } else {
                    user = await db.getUserByToken(authUser, authPass);
                }
            }

            if (user) {
                if (user.token) {
                    await db.markTokenSeen(user.token);
                }
                req.user = user;
                next();
                return;
            }
        }

        res.sendStatus(403);
        return;
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="notifier"');
    res.sendStatus(401);
};
