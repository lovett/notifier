'use strict';
let express, router, url;

express = require('express');

router = express.Router();

url = require('url');

router.get('/', (req, res) => {
    let token;

    function sendUrl (tokenValue) {
        let redirectUri = url.format({
            protocol: req.query.protocol,
            host: req.query.host,
            pathname: '/authorize/pushbullet/finish',
            query: {
                token: tokenValue
            }
        });

        res.json({
            url: url.format({
                protocol: 'https',
                slashes: true,
                host: 'www.pushbullet.com',
                pathname: '/authorize',
                query: {
                    'client_id': req.app.locals.nconf.get('PUSHBULLET_CLIENT_ID'),
                    'response_type': 'code',
                    'redirect_uri': redirectUri
                }
            })
        });
    }

    token = req.app.locals.Token.build({
        key: 'pushbullet',
        label: 'service'
    });

    req.app.locals.Token.generateKeyAndValue((key, value) => {
        token.value = value;
        token.save().then((token) => {
            token.setUser(req.user).then(() => {
                sendUrl(token.value);
            });
        }, (error) => {
            res.status(400).json(error);
        });
    });

});

module.exports = exports = router;
