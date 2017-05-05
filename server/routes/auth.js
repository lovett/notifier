let express, router;

express = require('express');

router = express.Router();

router.post('/', function (req, res) {
    var sendResponse, token, tokenLabel, tokenPersist;
    tokenLabel = req.body.label || '';
    tokenLabel = tokenLabel.replace(/[^a-zA-Z0-9-\.\/ ]/, '');
    if (tokenLabel === '') {
        tokenLabel =  useragent.parse(req.headers['user-agent']).toString();
    }

    tokenPersist = req.body.persist === '1' || req.body.persist === 'true';

    token = res.app.locals.Token.build({
        label: tokenLabel,
        persist: tokenPersist
    });

    sendResponse = function (token) {
        token.setUser(req.user).then(function () {

            res.format({
                'text/plain': function () {
                    var csv = util.format('%s,%s,%s',
                                          token.key, token.value, req.user.getChannel());
                    res.send(csv);
                },
                'application/json': function () {
                    res.json({
                        key: token.key,
                        value: token.value,
                        channel: req.user.getChannel()
                    });
                },
                'default': function () {
                    res.status(406).send('Not Acceptable');
                }
            });
        });
    };

    res.app.locals.Token.generateKeyAndValue(function (key, value) {
        token.key = key;
        token.value = value;

        res.app.locals.Token.prune(function () {
            token.save().then(sendResponse, function (error) {
                res.status(400).json(error);
            });
        });
    });

});

module.exports = exports = router;
