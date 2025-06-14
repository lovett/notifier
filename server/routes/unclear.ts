import db from '../db';
import type User from '../User';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import publishMessage from '../helpers/publish-message';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;

    if (!req.body.publicId) {
        const err = new Error('Request lacked a publicId');
        res.status(400);
        next(err);
        return;
    }

    const publicId = req.body.publicId;

    try {
        await db.markMessagesUnread(user.id, [publicId]);

        const message = await db.getMessage(user.id, publicId);

        if (!message) {
            res.sendStatus(404);
            return;
        }

        message.deliveryStyle = 'whisper';

        publishMessage(req.app, user.id, message);

        res.sendStatus(204);
    } catch (e) {
        res.status(500).json(e);
    }
});

export default router;
