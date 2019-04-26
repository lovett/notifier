import * as db from '../db';
import { Request, Response } from 'express';
import PromiseRouter from 'express-promise-router';

const router = PromiseRouter();

/**
 * Remove an access token
 *
 * This is the destructive counterpart to /auth
 */
router.post('/', async (req: Request, res: Response) => {
    const baseUrl = req.app.locals.config.get('NOTIFIER_BASE_URL');

    const [key, value] = req.cookies.token;

    try {
        await db.deleteToken(req.user!.id, key, value);
        res.clearCookie('token', { path: baseUrl });
        return res.sendStatus(200);
    } catch (e) {
        return res.status(500).json(e);
    }
});

export default router;
