import * as express from 'express';

const router = express.Router();

/**
 * Remove an access token
 *
 * This is the destructive counterpart to /auth
 */
router.post('/', (req: express.Request, res: express.Response) => {
    const baseUrl = req.app.locals.config.get('NOTIFIER_BASE_URL');

    const [key, value] = req.cookies.token;

    const queryParams = {
        where: { key, value },
    };

    req.app.locals.Token.destroy(queryParams).then(() => {
        res.clearCookie('token', {path: baseUrl});
    }).finally(() => res.sendStatus(200));
});

export default router;
