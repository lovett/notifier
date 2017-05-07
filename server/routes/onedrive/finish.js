'use strict';

let express, fs, needle, router;

express = require('express');

fs = require('fs');

needle = require('needle');

router = express.Router();

router.get('/', (req, res) => {
    let callback;

    if (!req.query.code) {
        res.sendStatus(req.app.badRequestCode);

        return;
    }

    needle.post('https://login.live.com/oauth20_token.srf', {
        'client_id': req.app.config.get('ONEDRIVE_CLIENT_ID'),
        'redirect_uri': req.app.config.get('ONEDRIVE_REDIRECT'),
        'client_secret': req.app.config.get('ONEDRIVE_CLIENT_SECRET'),
        'code': req.query.code,
        'grant_type': 'authorization_code'
    }, callback);


    callback = (err, resp) => {
        if (err) {
            res.send(req.app.applicationError);

            return;
        }

        if (resp.body.error) {
            res.status(req.app.locals.badRequestCode).json(resp.body);

            return;
        }

        fs.writeFile(req.app.config.get('ONEDRIVE_AUTH_FILE'), JSON.stringify(resp.body), (err) => {
            if (err) {
                res.sendStatus(req.app.locals.applicationErrorCode);

                return;
            }

            res.redirect(req.app.config.get('NOTIFIER_BASE_URL'));
        });
    };
});

module.exports = exports = router;
