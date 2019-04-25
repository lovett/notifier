import * as db from '../../db';
import { NextFunction, Request, Response } from 'express';
import PromiseRouter from 'express-promise-router';
import * as dateparser from 'dateparser';
import publishMessage from '../../helpers/publish-message';
import Message from '../../Message';

const router = PromiseRouter();

async function validate(req: Request, res: Response, next: NextFunction) {
    if (Object.keys(req.body).length === 0) {
        res.status(400);
        throw new Error('No fields specified');
    }

    if (req.body.expiresAt) {
        const parsedExpiration = dateparser.parse(req.body.expiresAt);
        if (parsedExpiration) {
            req.body.expiresAt = new Date(Date.now() + parsedExpiration.value);
        }
    }

    req.body.message = new Message(req.body);

    return next();
}

/**
 * Retract unread messages with the same local id as the incoming
 * message.
 *
 * This enforces uniqueness from the client's perspective. From the
 * perspective of the database, localIds are not unique.
 */
async function retract(req: Request, res: Response, next: NextFunction) {
    const message: Message = req.body.message;

    if (!message.localId) {
        next();
    }

    try {
        const messageIds = await db.getRetractableMessageIds(
            req.user!.id,
            message.localId!,
        );

        await db.markMessagesRead(req.user!.id, messageIds);

        for (const id of messageIds) {
            delete req.app.locals.expirationCache[id];
            publishMessage(req.app, req.user!.id, null, id);
        }
    } catch (err) {
        res.status(500);
        throw err;
    }

    next();
}

async function save(req: Request, res: Response, next: NextFunction) {
    const message: Message = req.body.message;

    try {
        await db.addMessages(req.user!.id, [message]);
    } catch (err) {
        res.status(500);
        throw err;
    }

    if (message.expiresAt) {
        req.app.locals.expirationCache[message.publicId!] = [req.user, message.expiresAt];
    }

    next();
}

async function publish(req: Request, res: Response, next: NextFunction) {
    const message: Message = req.body.message;

    try {
        await publishMessage(req.app, req.user!.id, message);
    } catch (err) {
        res.status(500);
        throw err;
    }

    res.sendStatus(204);
    next();
}

router.post('/', [validate, retract, save, publish]);

export default router;
