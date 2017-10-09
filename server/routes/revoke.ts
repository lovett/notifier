import * as express from 'express';

const router = express.Router();

router.post('/', (req: express.Request, res: express.Response) => {

    req.app.locals.Token.destroy({
        where: {
            UserId: req.user.id,
            key: req.body.service,
            label: 'service',
        },
    }).then((affectedRows: number) => {
        if (affectedRows === 0) {
            res.sendStatus(500);
            return;
        }
        res.sendStatus(200);
    });
});

export default router;
