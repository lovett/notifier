import * as db from '../db';
import User from '../User';
import { Request, Response } from 'express';
import PromiseRouter from 'express-promise-router';

const router = PromiseRouter();

/**
 * Remove an access token
 *
 * This is the destructive counterpart to /auth
 */
router.post('/', async (req: Request, res: Response) => {
    const user = req.user as User;
    const baseUrl = req.app.locals.config.get('NOTIFIER_BASE_URL');

    const [key, value] = req.cookies.token.split(',', 2);

    try {
        await db.deleteToken(user.id, key, value);
        res.clearCookie('token', { path: baseUrl });
        return res.sendStatus(200);
    } catch (e) {
        console.log(e);
        return res.sendStatus(500);
    }
});

export default router;
