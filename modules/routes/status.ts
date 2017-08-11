import * as express from 'express';

const router = express.Router();

/**
 * A monitoring endpoint to confirm the server is running.
 */
router.get('/', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.type('txt');
    res.send('OK');
});

export default router;
