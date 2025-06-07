import db from '../db';
import type User from '../User';
import type { Request, Response } from 'express';
import Router from 'express';
import Token from '../Token';

const router = Router();

/**
 * Return a list of additional functionality the user has opted into
 *
 * Services can be third-party integrations or application-local
 * functionality.
 *
 * Client-specific functionality is not included, specifically browser
 * push notifications.
 */
router.get('/', async (req: Request, res: Response) => {
    const user = req.user as User;
    const tokens = await db.getServiceTokens(user.id);
    res.json(tokens);
});

/**
 * Activate or deactive additional services
 *
 * Deactivation is based on whether a value is provided for a given
 * service key. If yes, an existing key is removed and a new key is
 * created. If no, only the removal happens.
 */
router.post('/', async (req: Request, res: Response) => {
    const additions: Token[] = [];
    const removals: string[] = [];
    const whitelist = ['webhook'];

    for (const name in req.body) {
        if (whitelist.indexOf(name) === -1) {
            continue;
        }

        removals.push(name);

        if (req.body[name] === null) {
            continue;
        }

        const token = new Token('userval', true, name, req.body[name]);

        additions.push(token);
    }

    if (removals.length === 0 && additions.length === 0) {
        res.status(400).send('Nothing to be done');
        return;
    }

    try {
        const user = req.user as User;
        await db.deleteTokensByKey(user.id, removals);
        await db.addTokens(user.id, additions);
        res.sendStatus(200);
    } catch (e) {
        res.status(500).json(e);
    }
});

export default router;
