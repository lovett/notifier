import * as express from 'express';
import publishMessage from '../../helpers/publish-message';
import { MessageInstance, User } from '../../types/server';

const router = express.Router();

router.post('/', (req: express.Request, res: express.Response) => {

    const update = (id: string) => {
        req.app.locals.Message.update(
            {unread: false},
            {where: {publicId: id}},
        ).then((affectedRows: number[]) => {
            if (affectedRows[0] === 0) {
                res.sendStatus(304);

                return;
            }

            delete req.app.locals.expirationCache[id];

            publishMessage(req.app, req.user as User, null, id);
            res.sendStatus(204);

            return true;
        }).catch(() => res.sendStatus(500));
    };

    if (req.body.hasOwnProperty('publicId')) {
        update(req.body.publicId);
    } else if (req.body.hasOwnProperty('localId')) {
        req.app.locals.Message.find({
            limit: 1,
            where: {
                localId: req.body.localId,
                unread: true,
            },
        }).then((message: MessageInstance) => {
            if (!message) {
                res.sendStatus(404);
            } else {
                update(message.publicId);
            }
        });
    } else {
        res.sendStatus(400);
    }

});

export default router;
