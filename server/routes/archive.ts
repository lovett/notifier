import * as db from '../db';
import * as express from 'express';
import PromiseRouter from 'express-promise-router';

const router = PromiseRouter();

router.get('/:count?', async (req: express.Request, res: express.Response) => {
    const maxCount = 50;
    const count = Math.min(parseInt(req.params.count || maxCount, 10), maxCount);

    const since = parseInt(req.query.since, 10) || 0;

    const startDate = new Date(since);

    try {
        const messages = await db.getUnreadMessages(req.user!.id, startDate, count);

        res.send({
            limit: count,
            messages,
        });
        return true;
    } catch (e) {
        return res.status(500).json(e);
    }
});

export default router;
