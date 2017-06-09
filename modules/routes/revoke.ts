import * as express from "express";

const router = express.Router();

router.post('/', function (req: express.Request, res: express.Response) {
    let statusCodeByDeletionCount = (count: number) => {
        if (count === 0) {
            res.sendStatus(500);
            return;
        }
        res.sendStatus(200);
    };

    req.user.purgeServiceToken(req.body.service, statusCodeByDeletionCount);
});

export default router;
