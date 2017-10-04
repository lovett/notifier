import * as express from 'express';
import {MessageInstance} from '../../types/server';

const router = express.Router();

interface IWhereDate {
    $lte?: Date;
    $gt?: Date;
}

interface IWhereFilter {
    UserId: number;
    unread: boolean;
    deliveredAt: IWhereDate;
    received?: IWhereDate;
}

router.get('/:count', (req: express.Request, res: express.Response) => {
    const filters = {
        attributes: ['id', 'publicId', 'title', 'url', 'body', 'source', 'group', 'received', 'expiresAt'],
        limit: req.params.count,
        order: [['deliveredAt', 'DESC']],
        where: {
            UserId: req.user.id,
            deliveredAt: { $lte: new Date() },
            unread: true,
        } as IWhereFilter,
    };

    if (req.query.since) {
        req.query.since = parseInt(req.query.since, 10) || 0;
        if (req.query.since > 0) {
            filters.where.received = {
                $gt: new Date(req.query.since),
            };
        }
    }

    req.app.locals.Message.findAll(filters).then((messages: MessageInstance[]) => {
        const now = new Date();

        const filteredMessages = messages.filter((message: MessageInstance) => {
            if (message.expiresAt === null) {
                return true;
            }

            if (message.expiresAt! < now) {
                message.update({unread: false});

                return false;
            }

            return true;
        });

        const mappedMessages = filteredMessages.map((message: MessageInstance) => {
            const messageValues = message.get({plain: true});

            delete messageValues.id;

            return messageValues;
        });

        res.send({
            limit: req.params.count,
            mappedMessages,
        });
    });
});

export default router;
