import * as db from '../db';
import User from '../User';
import * as express from 'express';
import PromiseRouter from 'express-promise-router';

const router = PromiseRouter();

router.get('/:count?', async (req: express.Request, res: express.Response) => {
    const user = req.user as User;
    const maxCount = 50;

    let count = maxCount;
    if (req.params.count) {
        count = Math.min(parseInt(req.params.count, 10), maxCount);
    }

    const since = parseInt(req.query.since, 10) || 0;

    const startDate = new Date(since);

    try {
        const messages = await db.getUnreadMessages(user.id, startDate, count);

        for (const message of messages) {
            message.urlizeBadge(req.app.locals.config.get('NOTIFIER_BADGE_BASE_URL'));
        }

        res.send(messages);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

export default router;
