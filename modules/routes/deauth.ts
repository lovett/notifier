import * as express from "express";

const router = express.Router();

/**
 * Remove a access token
 *
 * This is the destructive counterpart to /auth
 */
router.post('/', function(req: express.Request, res: express.Response) {
    let params = {
        where: {
            value: req.user.token.value
        }
    };

    req.app.locals.Token.destroy(params)
        .then(() => res.sendStatus(200));
});

export default router;
