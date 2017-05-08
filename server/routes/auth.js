'use strict';

let express, router, useragent;

express = require('express');
router = express.Router();
useragent = require('useragent');

router.post('/', (req, res) => {
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

    req.app.locals.Token.generateKeyAndValue(generateCallback);

    generateCallback = (key, value) => {
        token.key = key;
        token.value = value;
        req.app.locals.Token.prune(pruneCallback(token));
    };

    pruneCallback = () => {
        token.save()
            .then(() => token.setUser(req.user))
            .then(sendResponse)
            .catch(sendFailure);
    };

    sendResponse = () => {
        res.format({
            'text/plain': asText,
            'application/json': asJson,
            'default': asRejection
        });
    };

    asText = () => res.send(`${token.key},${token.value},${req.user.getChannel()}`);

    asRejection = () => res.status(req.app.locals.badMethodCode).send('Not Acceptable');

    asJson = () => {
        res.json({
            key: token.key,
            value: token.value,
            channel: req.user.getChannel()
        });
    };

    sendFailure = (error) => {
        res.status(req.app.locals.badRequestCode).json(error);
    };

});

module.exports = exports = router;
