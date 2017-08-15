import * as express from "express";
import * as url from "url";
import * as needle from "needle";

const router = express.Router();

router.get('/', (req: express.Request, res: express.Response) => {
    let config, querystringToken, tokenUrl;

    config = req.app.locals.config;

    tokenUrl = url.format({
        protocol: 'https',
        slashes: true,
        host: 'api.pushbullet.com',
        pathname: '/oauth2/token'
    });

    // If access has been denied, Pushbullet incorrectly formats
    // the URL with an extra ? which results in req.query.token
    // containing the token plus extra garbage.
    querystringToken = req.query.token.replace(/\?.*/, '');

    req.app.locals.Token.find({
        include: [ req.app.locals.User],
        where: {
            value: querystringToken
        }
    }).then((token) => {
        if (!token || !token.User) {
            res.redirect(config.get('NOTIFIER_BASE_URL'));

            return;
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
            'client_id': config.get('NOTIFIER_PUSHBULLET_CLIENT_ID'),
            'client_secret': config.get('NOTIFIER_PUSHBULLET_CLIENT_SECRET'),
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

export default router;
