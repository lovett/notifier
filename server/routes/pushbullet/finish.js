'use strict';
let express, needle, router, url;

express = require('express');
needle = require('needle');
url = require('url');

router = express.Router();


router.get('/', (req, res) => {
    let config, tokenUrl;

    config = req.app.locals.config;

    tokenUrl = url.format({
        protocol: 'https',
        slashes: true,
        host: 'api.pushbullet.com',
        pathname: '/oauth2/token'
    });

    req.app.locals.Token.find({
        include: [ req.app.locals.User],
        where: {
            value: req.query.token
        }
    }).then((token) => {
        if (!token.User) {
            console.error({}, 'user not found during pushbullet auth callback');
            res.redirect(config.get('NOTIFIER_BASE_URL'));

            return false;
        }

        if (!req.query.code) {
            req.app.locals.Token.destroy({
                where: {
                    key: 'pushbullet',
                    UserId: token.User.id
                }
            }).then(() => res.redirect(config.get('NOTIFIER_BASE_URL')));

            return;
        }

        needle.post(tokenUrl, {
            'grant_type': 'authorization_code',
            'client_id': config.get('PUSHBULLET_CLIENT_ID'),
            'client_secret': config.get('PUSHBULLET_CLIENT_SECRET'),
            'code': req.query.code
        }, (err, resp, body) => {
            req.app.locals.Token.destroy({
                where: {
                    key: 'pushbullet',
                    UserId: token.User.id,
                    id: {
                        $ne: token.id
                    }
                }
            }).then(() => {
                token.updateAttributes({
                    value: body.access_token,
                    persist: true
                }).then(() => res.redirect(config.get('NOTIFIER_BASE_URL')));
            });
        });
    }, () => res.sendStatus(400));
});

module.exports = exports = router;
