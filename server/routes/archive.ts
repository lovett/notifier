import * as express from 'express';
import * as Sequelize from 'sequelize';
import {MessageInstance} from '../types/server';

const router = express.Router();

interface WhereFilter {
    UserId: number;
    unread: boolean;
    received?: any;
}

router.get('/:count?', (req: express.Request, res: express.Response) => {
    const maxCount = 50;

    const count = Math.min(parseInt(req.params.count || maxCount, 10), maxCount);

    const filters = {
        attributes: ['id', 'publicId', 'title', 'url', 'body', 'source', 'group', 'received', 'expiresAt'],
        limit: count,
        order: [['received', 'DESC']],
        where: {
            UserId: req.user.id,
            received: { [Sequelize.Op.lte]: new Date() },
            unread: true,
        } as WhereFilter,
    };

    if (req.query.since) {
        req.query.since = parseInt(req.query.since, 10) || 0;
        if (req.query.since > 0) {
            filters.where.received = {
                [Sequelize.Op.gt]: new Date(req.query.since),
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
            messages: mappedMessages,
        });
    });
});

export default router;
