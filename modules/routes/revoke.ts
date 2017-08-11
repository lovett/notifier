import * as express from 'express';

const router = express.Router();

router.post('/', (req: express.Request, res: express.Response) => {
    req.user.purgeServiceToken(req.body.service, (count: number) => {
        if (count === 0) {
            res.sendStatus(500);
            return;
        }
        res.sendStatus(200);
    });
});

export default router;
