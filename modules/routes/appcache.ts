import * as express from "express";

const router = express.Router();

router.get('/', (req: express.Request, res: express.Response) => {
    res.type('appcache');
    res.render('appCache');
});

export default router;
