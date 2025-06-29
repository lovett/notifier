import db from '../db';
import type User from '../User';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import publishMessage from '../helpers/publish-message';
import Message from '../Message';

const router = Router();

function parseRelativeDate(value: string): number {
    const units: Record<string, number> = {
        'second': 1,
        'minute': 60,
        'hour': 3600,
        'day': 86400,
    };

    let totalMs = 0;

    for (const unit of Object.keys(units)) {
        const regex = new RegExp(`(?<quantity>\\d+)\\s+${unit}s?`, 'i');
        const matches = value.trim().match(regex);

        if (matches?.groups?.quantity) {
            totalMs +=
                Number.parseInt(matches.groups.quantity, 10) *
                (units[unit] || 1) *
                1000;
        }
    }

    return totalMs;
}

async function validate(req: Request, res: Response, next: NextFunction) {
    if (Object.keys(req.body).length === 0) {
        res.status(400);
        throw new Error('No message fields specified');
    }

    if (req.body.expiresAt) {
        const parsedExpiration = parseRelativeDate(req.body.expiresAt);
        if (parsedExpiration > 0) {
            req.body.expiresAt = new Date(Date.now() + parsedExpiration);
        }
    }

    req.body.message = new Message(req.body);

    next();
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
        return;
    }

    try {
        const user = req.user as User;

        const messageIds = await db.getRetractableMessageIds(
            user.id,
            message.localId,
        );

        await db.markMessagesRead(user.id, messageIds);

        for (const id of messageIds) {
            delete req.app.locals.expirationCache[id];
            publishMessage(req.app, user.id, null, id);
        }
    } catch (err) {
        res.status(500);
        throw err;
    }

    next();
}

async function save(req: Request, res: Response, next: NextFunction) {
    const user = req.user as User;
    const message: Message = req.body.message;

    try {
        await db.addMessages(user.id, [message]);
    } catch (err) {
        res.status(500);
        throw err;
    }

    if (message.expiresAt) {
        req.app.locals.expirationCache.set(message.publicId, [
            req.user,
            message.expiresAt,
        ]);
    }

    next();
}

async function publish(req: Request, res: Response, next: NextFunction) {
    const message: Message = req.body.message;
    const user = req.user as User;

    try {
        publishMessage(req.app, user.id, message);
    } catch (err) {
        res.status(500);
        throw err;
    }

    res.sendStatus(204);
    next();
}

router.post('/', [validate, retract, save, publish]);

export default router;
