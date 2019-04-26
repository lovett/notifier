import * as db from '../db';
import { NextFunction, Request, Response } from 'express';
import * as useragent from 'useragent';
import Token from '../Token';
import PromiseRouter from 'express-promise-router';
import { CookieOptions } from 'express-serve-static-core';

const router = PromiseRouter();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    let label = req.body.label || '';
    label = label.replace(/[^a-zA-Z0-9-\.\/ ]/, '');

    if (label === '') {
        label = useragent.parse(req.get('user-agent')).toString();
    }

    const persist = [true, '1', 'true'].indexOf(req.body.persist) > -1;

    const token = new Token(label, persist);

    await db.addTokens(req.user, [token]);

    const cookieOptions: CookieOptions = {
        path: req.app.locals.config.get('NOTIFIER_BASE_URL'),
    };

    if (token.persist) {
        cookieOptions.expires = new Date(Date.now() + (86400000 * 30));
    }

    res.cookie('token', `${token.key},${token.value}`, cookieOptions);

    res.format({
        'application/json': () => res.json({
            key: token.key,
            value: token.value,
        }),
        'default': () => res.status(406).send('Not Acceptable'),
        'text/plain': () => res.send(`${token.key},${token.value}`),
    });

    next();
});

export default router;
