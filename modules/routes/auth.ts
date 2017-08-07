import * as express from 'express';
import * as useragent from 'useragent';

const router = express.Router();

router.post('/', (req: express.Request, res: express.Response) => {
    let generateCallback;
    let pruneCallback;
    let sendResponse;
    let token;
    let tokenPersist;

    let tokenLabel = req.body.label || '';
    tokenLabel = tokenLabel.replace(/[^a-zA-Z0-9-\.\/ ]/, '');

    if (tokenLabel === '') {
        tokenLabel = useragent.parse(req.get('user-agent')).toString();
    }

    tokenPersist = ['1', 'true'].indexOf(req.body.persist) > -1;

    token = req.app.locals.Token.build({
        label: tokenLabel,
        persist: tokenPersist,
    });

    pruneCallback = (t) => {
        t.save()
            .then(() => t.setUser(req.user))
            .then(sendResponse)
            .catch((err) => {
                res.status(400).json(err);
            });
    };

    generateCallback = (key, value) => {
        token.key = key;
        token.value = value;
        req.app.locals.Token.prune(pruneCallback(token));
    };

    req.app.locals.Token.generateKeyAndValue(generateCallback);

    sendResponse = () => {
        const key = token.key;
        const value = token.value;

        res.format({
            'application/json': () => res.json({key, value}),
            'default': () => res.status(406).send('Not Acceptable'),
            'text/plain': () => res.send(`${key},${value}`),
        });
    };

});

export default router;
