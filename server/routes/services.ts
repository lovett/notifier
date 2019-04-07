import * as db from '../db';
import * as express from 'express';
import PromiseRouter from 'express-promise-router';
import { TokenRecord } from '../types/server';

const router = PromiseRouter();

/**
 * Return a list of additional functionality the user has opted into
 *
 * Services can be third-party integrations or application-local
 * functionality.
 *
 * Client-specific functionality is not included, specifically browser
 * push notifications.
 */
router.get('/', async (req: express.Request, res: express.Response) => {
    const tokens = await db.getServiceTokens(req.user.id);

    const services = tokens.map((token) => {
        if (token.label === 'service') {
            delete token.value;
        }
        delete token.label;
        return token;
    });

    res.json(services);
});

/**
 * Activate or deactive additional services
 *
 * Deactivation is based on whether a value is provided for a given
 * service key. If yes, an existing key is removed and a new key is
 * created. If no, only the removal happens.
 */
router.post('/', async (req: express.Request, res: express.Response) => {
    const additions: TokenRecord[] = [];
    const removals: string[] = [];
    const whitelist = ['webhook'];

    for (const name in req.body) {
        if (whitelist.indexOf(name) === -1) {
            continue;
        }

        removals.push(name);

        if (req.body[name].trim().length === 0) {
            continue;
        }

        additions.push({
            key: name,
            label: 'userval',
            persist: true,
            value: req.body[name],
        });
    }

    if (removals.length === 0 && additions.length === 0) {
        res.status(400).send('Nothing to be done');
        return;
    }

    try {
        await db.deleteTokensByKey(req.user!.id, removals);
        await db.addTokens(req.user!.id, additions);
        return res.sendStatus(200);
    } catch (e) {
        return res.status(500).json(e);
    }
});

export default router;
