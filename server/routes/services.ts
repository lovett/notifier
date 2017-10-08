import * as express from 'express';
import {Token} from '../../types/server';

const router = express.Router();

/**
 * Return a list of the additonal functionality the user has opted into
 *
 * Services can be third-party integrations or application-local
 * functionality.
 *
 * Client-specific functionality is not included, specifically browser
 * push notifications.
 */
router.get('/', (req: express.Request, res: express.Response) => {
    req.user.getServiceTokens(() => {

        const services = req.user.serviceTokens.map((token: Token) => {
            if (token.label === 'service') {
                delete token.value;
            }
            delete token.label;
            return token;
        });

        res.json(services);
    });
});

router.post('/', (req: express.Request, res: express.Response) => {
    const additions: Token[] = [];
    const removals: string[] = [];
    const whitelist = ['webhook'];

    for (const name in req.body) {
        if (whitelist.indexOf(name) === -1) {
            continue;
        }

        removals.push(name);

        if (req.body[name].trim().length === 0) {
            continue;
        }

        additions.push({
            UserId: req.user.id,
            key: name,
            label: 'userval',
            persist: true,
            value: req.body[name],
        });
    }

    if (removals.length === 0 && additions.length === 0) {
        res.status(400).send('Nothing to be done');
        return;
    }

    req.app.locals.Token.destroy({
        where: {
            UserId: req.user.id,
            key: {
                $in: removals,
            },
        },
    }).then(() => {
        return req.app.locals.Token.bulkCreate(additions);
    }).then(() => {
        res.sendStatus(200);
    }).catch((error: Error) => {
        res.status(500).json(error);
    });
});

export default router;
