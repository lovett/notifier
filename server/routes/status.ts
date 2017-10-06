import * as express from 'express';

const router = express.Router();

/**
 * A monitoring endpoint to confirm the server is running.
 */
router.get('/', (_: express.Request, res: express.Response) => {
    res.type('txt');
    res.send('OK');
});

export default router;
