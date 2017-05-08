let express, router;

express = require('express');

router = express.Router();

router.get('/', function (req, res) {
    var tokenUrl = url.format({
        protocol: 'https',
        slashes: true,
        host: 'api.pushbullet.com',
        pathname: '/oauth2/token'
    });

    req.app.locals.Token.find({
        include: [ User],
        where: {
            value: req.query.token
        }
    }).then(function (token) {
        if (!token.User) {
            console.error({}, 'user not found during pushbullet auth callback');
            res.redirect(nconf.get('NOTIFIER_BASE_URL'));
            return;
        }

        if (!req.query.code) {
            req.app.locals.Token.destroy({
                where: {
                    key: 'pushbullet',
                    UserId: token.User.id
                }
            }).then(function () {
                res.redirect(nconf.get('NOTIFIER_BASE_URL'));
            });
            return;
        }

        needle.post(tokenUrl, {
            'grant_type': 'authorization_code',
            'client_id': nconf.get('PUSHBULLET_CLIENT_ID'),
            'client_secret': nconf.get('PUSHBULLET_CLIENT_SECRET'),
            'code': req.query.code
        }, function (err, resp, body) {
            req.app.local.Token.destroy({
                where: {
                    key: 'pushbullet',
                    UserId: token.User.id,
                    id: {
                        $ne: token.id
                    }
                }
            }).then(function () {
                /*jshint camelcase: false */
                token.updateAttributes({
                    value: body.access_token,
                    persist: true
                }).then(function () {
                    res.redirect(nconf.get('NOTIFIER_BASE_URL'));
                });
            });
        });
    }, function () { res.sendStatus(400); });
});

module.exports = exports = router;
