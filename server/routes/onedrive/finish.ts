import * as express from 'express';
import * as fs from 'fs';
import * as needle from 'needle';

const router = express.Router();

interface OnedrivePostParams {
    client_id: string;
    client_secret: string;
    code: string;
    grant_type: string;
    redirect_uri: string;
}


router.get('/', (req: express.Request, res: express.Response) => {
    if (!req.query.code) {
        res.sendStatus(400);
        return;
    }

    const config = req.app.locals.config;

    const callback = (err: Error, resp: any) => {
        if (err) {
            res.send(500);
            return;
        }

        if (resp.body.error) {
            res.status(400).json(resp.body);
            return;
        }

        fs.writeFile(config.get('ONEDRIVE_AUTH_FILE'), JSON.stringify(resp.body), (fsErr) => {
            if (fsErr) {
                res.sendStatus(500);
                return;
            }

            res.redirect(config.get('NOTIFIER_BASE_URL'));
        });
    };

    const postParams: OnedrivePostParams = {
        client_id: config.get('ONEDRIVE_CLIENT_ID'),
        client_secret: config.get('ONEDRIVE_CLIENT_SECRET'),
        code: req.query.code,
        grant_type: 'authorization_code',
        redirect_uri: config.get('ONEDRIVE_REDIRECT'),
    };

    needle.post('https://login.live.com/oauth20_token.srf', postParams, callback);

});

export default router;
