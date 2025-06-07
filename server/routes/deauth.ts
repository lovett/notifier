import db from '../db';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';

const router = Router();

/**
 * Remove an access token
 *
 * This is the destructive counterpart to /auth
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const baseUrl = req.app.locals.config.get('NOTIFIER_BASE_URL');

    let key: string;
    let value: string | number | null;

    if (req.body.key && req.body.value) {
        key = req.body.key;
        value = req.body.value;
    }

    if (req.cookies.token) {
        [key, value] = req.cookies.token.split(',', 2);
    }

    if (key && value) {
        try {
            await db.deleteToken(key, value);
            res.clearCookie('token', { path: baseUrl });
            return res.sendStatus(200);
        } catch (e) {
            console.log(e);
            return res.sendStatus(500);
        }
    }

    const err = new Error('Credential not provided');
    res.status(400);
    return next(err);
});

export default router;
