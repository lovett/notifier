import db from '../db';
import User from '../User';
import { NextFunction, Request, Response, Router } from 'express';
import publishMessage from '../helpers/publish-message';

const router = Router();

/**
 * Endpoint for marking a message as read.
 *
 * Messages are specified by their public id or local id.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    let messageIds: string[] = [];

    if (!req.body.publicId && !req.body.localId) {
        const err = new Error('Message ID was not provided');
        res.status(400);
        return next(err);
    }

    if (req.body.publicId) {
        messageIds = messageIds.concat(req.body.publicId);
    }

    if (req.body.localId) {
        try {
            const ids = await db.getRetractableMessageIds(
                user.id,
                req.body.localId,
            );
            messageIds = messageIds.concat(ids);
        } catch (e) {
            res.status(500);
            return next(e);
        }
    }

    try {
        await db.markMessagesRead(user.id, messageIds);
        for (const id of messageIds) {
            delete req.app.locals.expirationCache[id];
            publishMessage(req.app, user.id, null, id);
        }
    } catch (e) {
        res.status(500);
        return next(e);
    }

    res.sendStatus(204);
});

export default router;
