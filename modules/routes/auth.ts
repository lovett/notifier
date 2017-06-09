import * as express from "express";
import * as useragent from "useragent";

const router = express.Router();

router.post('/', (req: express.Request, res: express.Response) => {
    let asJson, asRejection, asText, generateCallback, pruneCallback, sendFailure, sendResponse, token, tokenLabel, tokenPersist;

    tokenLabel = req.body.label || '';
    tokenLabel = tokenLabel.replace(/[^a-zA-Z0-9-\.\/ ]/, '');
    if (tokenLabel === '') {
        tokenLabel = useragent.parse(req.headers['user-agent']).toString();
    }

    tokenPersist = ['1', 'true'].indexOf(req.body.persist) > -1;

    token = req.app.locals.Token.build({
        label: tokenLabel,
        persist: tokenPersist
    });

    pruneCallback = (token) => {
        token.save()
            .then(() => token.setUser(req.user))
            .then(sendResponse)
            .catch(sendFailure);
    };

    generateCallback = (key, value) => {
        token.key = key;
        token.value = value;
        req.app.locals.Token.prune(pruneCallback(token));
    };

    req.app.locals.Token.generateKeyAndValue(generateCallback);



    sendResponse = () => {
        res.format({
            'text/plain': asText,
            'application/json': asJson,
            'default': asRejection
        });
    };

    asText = () => res.send(`${token.key},${token.value},${req.user.getChannel()}`);

    asRejection = () => res.status(406).send('Not Acceptable');

    asJson = () => {
        res.json({
            key: token.key,
            value: token.value,
            channel: req.user.getChannel()
        });
    };

    sendFailure = (error) => {
        res.status(400).json(error);
    };

});

export default router;
