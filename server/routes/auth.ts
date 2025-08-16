import db from '../db';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import Token from '../Token';
import type { CookieOptions } from 'express-serve-static-core';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const user = await db.getUser(req.body.username);

    if (!user) {
        res.sendStatus(401);
        return;
    }

    const validPassword = await user.testPassword(req.body.password);

    if (!validPassword) {
        res.sendStatus(401);
        return;
    }

    let label = req.body.label || req.get('user-agent') || '';
    label = label.replace(/[^a-zA-Z0-9-./ ]/, '').substring(0, 100);

    const persist = [true, '1', 'true'].indexOf(req.body.persist) > -1;

    const token = new Token(label, persist);

    await db.addTokens(user.id, [token]);

    const cookieOptions: CookieOptions = {
        path: req.app.locals.config.NOTIFIER_BASE_URL,
        sameSite: 'strict',
    };

    if (token.persist) {
        cookieOptions.expires = new Date(Date.now() + 86400000 * 30);
    }

    res.cookie('token', `${token.key},${token.value}`, cookieOptions);

    res.format({
        'application/json': () =>
            res.json({
                key: token.key,
                value: token.value,
            }),
        'default': () => res.status(406).send('Not Acceptable'),
        'text/plain': () => res.send(`${token.key},${token.value}`),
    });

    next();
});

export default router;
