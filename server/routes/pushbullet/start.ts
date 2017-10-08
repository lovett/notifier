import * as express from "express";
import * as url from "url";
import { TokenInstance } from '../../../types/server';

const router = express.Router();

router.get('/', (req: express.Request, res: express.Response) => {
    function sendUrl (tokenValue: string) {
        let config, redirectUri;

        config = req.app.locals.config;

        redirectUri = url.format({
            protocol: req.query.protocol,
            host: req.query.host,
            pathname: config.get('NOTIFIER_BASE_URL') + 'authorize/pushbullet/finish',
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
                    'client_id': config.get('NOTIFIER_PUSHBULLET_CLIENT_ID'),
                    'response_type': 'code',
                    'redirect_uri': redirectUri
                }
            })
        });
    }

    const token: TokenInstance = req.app.locals.Token.build({
        key: 'pushbullet',
        label: 'service'
    });

    req.app.locals.Token.generateKeyAndValue((_: string, value: string) => {
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

export default router;
