import * as express from 'express';
import * as url from 'url';

const router = express.Router();

interface OnedriveQueryParams {
    client_id: string;
    scope: string;
    response_type: string;
    redirect_uri: string;
}

router.get('/', (req: express.Request, res: express.Response) => {
    const endpoint = url.parse('https://login.live.com/oauth20_authorize.srf');

    // this endpoint can only be accessed by the default user
    if (req.user.username !== req.app.locals.config.get('NOTIFIER_DEFAULT_USER')) {
        res.sendStatus(400);
        return;
    }

    endpoint.query = {
        client_id: req.app.locals.config.get('ONEDRIVE_CLIENT_ID'),
        redirect_uri: req.app.locals.config.get('ONEDRIVE_REDIRECT'),
        response_type: 'code',
        scope: 'wl.offline_access onedrive.readwrite',
    } as OnedriveQueryParams;

    res.json({
        url: url.format(endpoint),
    });
});

export default router;
