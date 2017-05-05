let express, router;

express = require('express');

router = express.Router();

router.get('/', function (req, res) {
    var token;

    function sendUrl (tokenValue) {
        var redirectUri = url.format({
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
                    'client_id': nconf.get('PUSHBULLET_CLIENT_ID'),
                    'response_type': 'code',
                    'redirect_uri': redirectUri
                }
            })
        });
    }

    token = res.app.locals.Token.build({
        key: 'pushbullet',
        label: 'service'
    });

    res.app.locals.Token.generateKeyAndValue(function (key, value) {
        token.value = value;
        token.save().then(function (token) {
            token.setUser(req.user).then(function () {
                sendUrl(token.value);
            });
        }, function (error) {
            res.status(400).json(error);
        });
    });

});

module.exports = exports = router;
