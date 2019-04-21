import * as db from '../../db';
import * as express from 'express';
import PromiseRouter from 'express-promise-router';

const router = PromiseRouter();

router.post('/', async (req: express.Request, res: express.Response) => {
    if (!req.body.hasOwnProperty('publicId')) {
        res.sendStatus(400);
        return;
    }

    try {
        await db.markMessageUnread(req.user!.id, req.body.publicId);
        res.sendStatus(204);
        return;
    } catch (e) {
        return res.status(500).json(e);
    }
});

export default router;
