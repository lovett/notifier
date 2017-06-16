import {Request, Response, NextFunction} from "express";

const express = require('express');

const router = express.Router();

interface WhereDate {
    $lte?: Date,
    $gt?: Date
}

interface WhereFilter {
    UserId: number,
    unread: boolean,
    deliveredAt: WhereDate,
    received?: WhereDate
}

router.get('/:count', (req: Request, res: Response) => {
    let filters = {
        attributes: ['id', 'publicId', 'title', 'url', 'body', 'source', 'group', 'received', 'expiresAt'],
        limit: req.params.count,
        order: [['deliveredAt', 'DESC']],
        where: <WhereFilter>{
            UserId: req.user.id,
            unread: true,
            deliveredAt: { $lte: new Date() }
        }
    };

    if (req.query.since) {
        req.query.since = parseInt(req.query.since, 10) || 0;
        if (req.query.since > 0) {
            filters.where.received = {
                $gt: new Date(req.query.since)
            };
        }
    }

    req.app.locals.Message.findAll(filters).then((messages) => {
        let now = new Date();

        messages = messages.filter((message) => {
            if (message.expiresAt === null) {
                return true;
            }

            if (message.expiresAt < now) {
                message.update({unread: false});

                return false;
            }

            return true;
        });

        messages = messages.map((message) => {
            let messageValues = message.get({plain: true});

            delete messageValues.id;

            return messageValues;
        });

        res.send({
            limit: req.params.count,
            'messages': messages
        });
    });
});

export default router;
