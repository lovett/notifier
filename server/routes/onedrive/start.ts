import * as express from "express";
import * as url from "url";

const router = express.Router();

router.get('/', (req: express.Request, res: express.Response) => {
    let endpoint = url.parse('https://login.live.com/oauth20_authorize.srf');

    // this endpoint can only be accessed by the default user
    if (req.user.username !== req.app.locals.config.get('NOTIFIER_DEFAULT_USER')) {
        res.sendStatus(400);

        return;
    }

    endpoint.query = {
        'client_id': req.app.locals.config.get('ONEDRIVE_CLIENT_ID'),
        'scope': 'wl.offline_access onedrive.readwrite',
        'response_type': 'code',
        'redirect_uri': req.app.locals.config.get('ONEDRIVE_REDIRECT')
    };

    res.json({
        url: url.format(endpoint)
    });
});

export default router;
