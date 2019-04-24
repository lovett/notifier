import * as express from 'express';
import * as Sequelize from 'sequelize';
import * as dateparser from 'dateparser';
import publishMessage from '../../helpers/publish-message';
import { Message, MessageInstance, User } from '../../types/server';

const router = express.Router();

router.post('/', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let err: Error;

    if (Object.keys(req.body).length === 0) {
        err = new Error('Message is blank');
        res.status(400);

        return next(err);
    }

    const message: MessageInstance = req.app.locals.Message.build({
        received: new Date(),
    });

    Object.keys(req.app.locals.Message.rawAttributes).forEach((key: string) => {
        if (key === 'id' || key === 'publicId') {
            return;
        }

        if (req.body.hasOwnProperty(key) === false) {
            return;
        }

        if (!req.body[key]) {
            return;
        }

        if (req.body[key].trim() === '') {
            return;
        }

        if (key === 'expiresAt') {
            const parseResult = dateparser.parse(req.body[key]);
            if (parseResult !== null) {
                message.setDataValue(key, new Date(Date.now() + parseResult.value));
            }

            return;
        }

        message.setDataValue(key, req.body[key].trim());
    });

    // Retract unread messages with the same local id as the incoming
    // message. This enforces uniqueness from the client's
    // perspective. From the perspective of the database, localIds are
    // not unique.
    if (message.localId) {
        req.app.locals.Message.findAll({
            attributes: ['publicId'],
            where: {
                UserId: req.user!.id,
                localId: req.body.localId,
                publicId: {
                    [Sequelize.Op.ne]: message.publicId,
                },
                unread: true,
            },
        }).then((existingMessages: MessageInstance[]) => {
            if (existingMessages.length === 0) {
                return;
            }

            const ids = existingMessages.map((existingMessage) => {
                return existingMessage.publicId;
            });

            req.app.locals.Message.update({
                unread: false,
            }, {
                    where: {
                        publicId: {
                            [Sequelize.Op.in]: ids,
                        },
                    },
                }).then((updatedRows: number[]) => {
                    if (updatedRows[0] > 0) {
                        ids.forEach((id) => {
                            publishMessage(req.app, req.user!.id, null, id);
                        });
                    }
                });

            return null;
        });
    }

    message.save().then(() => {
        message.setUser(req.user as User).then(() => {
            const expiration = message.get('expiresAt');
            if (expiration) {
                req.app.locals.expirationCache[message.get('publicId')] = [req.user, message.get('expiresAt')];
            }

            publishMessage(req.app, req.user!.id, message);
            res.sendStatus(204);
        });
    }).catch((error: Error) => {
        res.status(400);
        next(error);
    });
});

router.patch('/', (req, res) => {
    const acceptedFields = ['title', 'url', 'body', 'source', 'group', 'received'];

    const fieldObject: Message = acceptedFields.reduce((acc: Message, field) => {
        if (req.body.hasOwnProperty(field)) {
            acc[field] = req.body[field];
        }

        return acc;
    }, {} as Message);

    req.app.locals.Message.update(fieldObject, {
        where: {
            UserId: req.user!.id,
            publicId: req.body.publicId,
        },
    }).then((affectedRows: number[]) => {
        if (affectedRows[0] !== 1) {
            res.sendStatus(400);
        }

        req.app.locals.Message.findOne({
            where: {
                UserId: req.user!.id,
                publicId: req.body.publicId,
            },
        }).then((message: MessageInstance) => {
            publishMessage(req.app, req.user!.id, message);
            res.sendStatus(204);
        });
    });
});

export default router;
