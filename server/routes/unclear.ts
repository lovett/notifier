import * as db from '../db';
import { NextFunction, Request, Response } from 'express';
import PromiseRouter from 'express-promise-router';

const router = PromiseRouter();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body.hasOwnProperty('publicId')) {
        const err = new Error('Reqest lacked a publicId');
        res.status(400);
        return next(err);
    }

    try {
        await db.markMessagesUnread(
            req.user,
            [req.body.publicId],
        );
        res.sendStatus(204);
        return;
    } catch (e) {
        return res.status(500).json(e);
    }
});

export default router;
