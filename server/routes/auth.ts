import * as express from 'express';
import * as useragent from 'useragent';
import generateTokenKeyValue from '../helpers/token-keyvalue';
import {GenerateCallback} from '../../types/server';

const router = express.Router();

router.post('/', (req: express.Request, res: express.Response) => {
    let tokenLabel = req.body.label || '';
    tokenLabel = tokenLabel.replace(/[^a-zA-Z0-9-\.\/ ]/, '');

    if (tokenLabel === '') {
        tokenLabel = useragent.parse(req.get('user-agent')).toString();
    }

    const token = req.app.locals.Token.build({
        label: tokenLabel,
        persist: [true, '1', 'true'].indexOf(req.body.persist) > -1,
    });

    const generateCallback: GenerateCallback = (key: string, value: string) => {
        token.key = key;
        token.value = value;

        req.app.locals.Token.destroy({
            where: {
                persist: false,
                updatedAt: {
                    lt: new Date(new Date().getTime() - (60 * 60 * 24 * 7 * 1000)),
                },
            },
        }).then(() => {
            token.save()
                .then(() => token.setUser(req.user))
                .then(sendResponse)
                .catch((err: Error) => {
                    res.status(400).json(err);
            });
        });
    };

    generateTokenKeyValue(generateCallback);

    const sendResponse = () => {
        const key = token.key;
        const value = token.value;

        const cookieOptions: express.CookieOptions = {
            path: req.app.locals.config.get('NOTIFIER_BASE_URL'),
        };

        if (token.persist) {
            cookieOptions.expires = new Date(Date.now() + (86400000 * 30));
        }

        res.cookie('token', `${key},${value}`, cookieOptions);

        res.format({
            'application/json': () => res.json({key, value}),
            'default': () => res.status(406).send('Not Acceptable'),
            'text/plain': () => res.send(`${key},${value}`),
        });
    };

});

export default router;
