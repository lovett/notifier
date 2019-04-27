import * as db from '../db';
import { NextFunction, Request, Response } from 'express';
import publishMessage from '../helpers/publish-message';
import PromiseRouter from 'express-promise-router';

const router = PromiseRouter();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body.hasOwnProperty('publicId')) {
        const err = new Error('Request lacked a publicId');
        res.status(400);
        return next(err);
    }

    const publicId = req.body.publicId;

    try {
        await db.markMessagesUnread(
            req.user,
            [publicId],
        );

        const message = await db.getMessage(req.user, publicId);

        publishMessage(req.app, req.user, message);

        res.sendStatus(204);
        return;
    } catch (e) {
        return res.status(500).json(e);
    }
});

export default router;
