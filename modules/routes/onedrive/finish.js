'use strict';
let express, fs, needle, router;

express = require('express');

fs = require('fs');

needle = require('needle');

router = express.Router();

router.get('/', (req, res) => {
    let callback, config;

    config = req.app.locals.config;

    if (!req.query.code) {
        res.sendStatus(400);

        return;
    }

    needle.post('https://login.live.com/oauth20_token.srf', {
        'client_id': config.get('ONEDRIVE_CLIENT_ID'),
        'redirect_uri': config.get('ONEDRIVE_REDIRECT'),
        'client_secret': config.get('ONEDRIVE_CLIENT_SECRET'),
        'code': req.query.code,
        'grant_type': 'authorization_code'
    }, callback);


    callback = (err, resp) => {
        if (err) {
            res.send(500);

            return;
        }

        if (resp.body.error) {
            res.status(400).json(resp.body);

            return;
        }

        fs.writeFile(config.get('ONEDRIVE_AUTH_FILE'), JSON.stringify(resp.body), (err) => {
            if (err) {
                res.sendStatus(500);

                return;
            }

            res.redirect(config.get('NOTIFIER_BASE_URL'));
        });
    };
});

module.exports = exports = router;
