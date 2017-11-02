import * as express from 'express';
import * as url from 'url';
import * as needle from 'needle';
import { TokenInstance } from '../../types/server';

const router = express.Router();

interface PushbulletPostParams {
    grant_type: string;
    client_id: string;
    client_secret: string;
    code: number;
}


router.get('/', (req: express.Request, res: express.Response) => {
    const config = req.app.locals.config;

    const tokenUrl = url.format({
        host: 'api.pushbullet.com',
        pathname: '/oauth2/token',
        protocol: 'https',
        slashes: true,
    });

    // If access has been denied, Pushbullet incorrectly formats
    // the URL with an extra ? which results in req.query.token
    // containing the token plus extra garbage.
    const querystringToken = req.query.token.replace(/\?.*/, '');

    req.app.locals.Token.find({
        include: [ req.app.locals.User],
        where: {
            value: querystringToken,
        },
    }).then((token: TokenInstance) => {
        if (!token || !token.User) {
            res.redirect(config.get('NOTIFIER_BASE_URL'));

            return;
        }

        if (!req.query.code) {
            req.app.locals.Token.destroy({
                where: {
                    UserId: token.User.id,
                    key: 'pushbullet',
                },
            }).then(() => res.redirect(config.get('NOTIFIER_BASE_URL')));

            return;
        }

        const postParams: PushbulletPostParams = {
            client_id: config.get('NOTIFIER_PUSHBULLET_CLIENT_ID'),
            client_secret: config.get('NOTIFIER_PUSHBULLET_CLIENT_SECRET'),
            code: req.query.code,
            grant_type: 'authorization_code',
        };

        needle.post(tokenUrl, postParams, (_err: Error, _res: any, body: any) => {
            req.app.locals.Token.destroy({
                where: {
                    UserId: token.User.id,
                    id: {
                        $ne: token.id,
                    },
                    key: 'pushbullet',
                },
            }).then(() => {
                token.updateAttributes({
                    persist: true,
                    value: body.access_token,
                }).then(() => res.redirect(config.get('NOTIFIER_BASE_URL')));
            });
        });
    }, () => res.sendStatus(400));
});

export default router;
