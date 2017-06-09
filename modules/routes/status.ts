import * as express from "express";

const router = express.Router();

/**
 * A static are-you-alive endpoint for monitoring and keep-alive
 */
router.get('/', function(req: express.Request, res: express.Response, next: express.NextFunction) {
    res.type('txt');
    res.send('OK');
});

export default router;
