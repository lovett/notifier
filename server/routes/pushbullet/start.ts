import * as express from 'express';
import * as url from 'url';
import generateTokenKeyValue from '../../helpers/token-keyvalue';

import { GenerateCallback, TokenInstance } from '../../../types/server';

const router = express.Router();

router.get('/', (req: express.Request, res: express.Response) => {
    function sendUrl(tokenValue: string) {
        const config = req.app.locals.config;

        const redirectUri = url.format({
            host: req.query.host,
            pathname: config.get('NOTIFIER_BASE_URL') + 'authorize/pushbullet/finish',
            protocol: req.query.protocol,
            query: {
                token: tokenValue,
            },
        });

        res.json({
            url: url.format({
                host: 'www.pushbullet.com',
                pathname: '/authorize',
                protocol: 'https',
                query: {
                    client_id: config.get('NOTIFIER_PUSHBULLET_CLIENT_ID'),
                    redirect_uri: redirectUri,
                    response_type: 'code',
                },
                slashes: true,
            }),
        });
    }

    const token: TokenInstance = req.app.locals.Token.build({
        key: 'pushbullet',
        label: 'service',
    });

    const callback: GenerateCallback = (_: string, value: string) => {
        token.value = value;
        token.save().then((t) => {
            t.setUser(req.user).then(() => {
                sendUrl(token.value);
            });
        }, (error: Error) => {
            res.status(400).json(error);
        });
    };

    generateTokenKeyValue(callback);

});

export default router;
