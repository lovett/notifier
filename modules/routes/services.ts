import * as express from 'express';

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
router.get('/', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    req.user.getServiceTokens(() => {

        const services = req.user.serviceTokens.map((token) => {
            if (token.label === 'service') {
                delete token.value;
            }
            delete token.label;
            return token;
        });

        res.json(services);
    });
});

router.post('/', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const additions = [];
    const removals = [];
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
    }).then((affectedRows) => {
        return req.app.locals.Token.bulkCreate(additions);
    }).then(() => {
        res.sendStatus(200);
    }).catch((error) => {
        res.status(500).json(error);
    });
});

export default router;
