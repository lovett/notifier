import * as express from "express";

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
    let callback = () => {

        let services = req.user.serviceTokens.map((token) => {
            if (token.label === 'service') {
                delete token.value;
            }
            delete token.label;
            return token;
        });

        res.json(services);
    };

    req.user.getServiceTokens(callback);
});

router.post('/', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let additions = [];
    let removals = [];
    let whitelist = ['webhook'];

    for (let name in req.body) {
        if (whitelist.indexOf(name) === -1) {
            continue;
        }

        removals.push(name);

        if (req.body[name].trim().length === 0) {
            continue;
        }

        additions.push({
            key: name,
            value: req.body[name],
            label: 'userval',
            persist: true,
            UserId: req.user.id
        });
    }

    console.log('removals', removals);
    console.log('additions', additions);

    if (removals.length === 0 && additions.length === 0) {
        res.status(400).send('Nothing to be done');
        return;
    }

    req.app.locals.Token.destroy({
        where: {
            key: {
                $in: removals
            },
            UserId: req.user.id
        }
    }).then(affectedRows => {
        return req.app.locals.Token.bulkCreate(additions);
    }).then(() => {
        res.sendStatus(200);
    }).catch(error => {
        console.log(error);
        res.status(500).json(error);
    });
});

export default router;
