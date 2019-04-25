import * as db from '../../db';
import { NextFunction, Request, Response } from 'express';
import publishMessage from '../../helpers/publish-message';
import PromiseRouter from 'express-promise-router';

const router = PromiseRouter();

/**
 * Endpoint for marking a message as read.
 *
 * Messages are specified by their public id or local id.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const messageIds: string[] = [];

    if (req.body.hasOwnProperty('publicId')) {
        messageIds.push(req.body.publicId);
    }

    if (req.body.hasOwnProperty('localId')) {
        try {
            const ids = await db.getRetractableMessageIds(
                req.user!.id,
                req.body.localId,
            );
            messageIds.concat(ids);
        } catch (e) {
            res.status(500);
            return next(e);
        }
    }

    if (messageIds.length === 0) {
        const err = new Error('Reqest lacked a publicId or localId');
        res.status(400);
        return next(err);
    }

    try {
        await db.markMessagesRead(req.user!.id, messageIds);
        for (const id of messageIds) {
            delete req.app.locals.expirationCache[id];
            publishMessage(req.app, req.user!.id, null, id);
        }
    } catch (e) {
        res.status(500);
        return next(e);
    }

    res.sendStatus(204);
});

export default router;
