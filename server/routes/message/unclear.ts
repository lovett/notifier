import * as express from 'express';

const router = express.Router();

router.post('/', (req: express.Request, res: express.Response) => {
    if (!req.body.hasOwnProperty('publicId')) {
        res.sendStatus(400);
        return;
    }

    req.app.locals.Message.update(
        {unread: true},
        {where: {publicId: req.body.publicId}},
    ).then((affectedRows: number[]) => {
        if (affectedRows[0] === 0) {
            res.sendStatus(400);
            return;
        }
        res.sendStatus(204);
    }).catch(() => {
        res.sendStatus(500);
    });

});

export default router;
