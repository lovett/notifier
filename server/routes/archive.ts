import db from '../db';
import type User from '../User';
import type { Request, Response } from 'express';
import { Router } from 'express';

const router = Router();

router.get('/{:count}', async (req: Request, res: Response) => {
    const user = req.user as User;
    const maxCount = 50;

    let count = maxCount;
    if (req.params.count) {
        count = Math.min(Number.parseInt(req.params.count, 10), maxCount);
    }

    const since = Number.parseInt(req.query.since as string, 10) || 0;

    const startDate = new Date(since);

    try {
        const messages = await db.getUnreadMessages(user.id, startDate, count);

        for (const message of messages) {
            message.urlizeBadge(req.app.locals.config.NOTIFIER_BADGE_BASE_URL);
        }

        res.send(messages);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

export default router;
