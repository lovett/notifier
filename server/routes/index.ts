import * as express from 'express';

const router = express.Router();

/**
 * The application homepage
 */
router.get('/', (req: express.Request, res: express.Response) => {
    const config = req.app.locals.config;

    let title = 'Notifier';
    if (req.app.get('env') && req.app.get('env') !== 'production') {
        title += ' ' + req.app.get('env');
    }

    res.render('index', {
        base_href: config.get('NOTIFIER_BASE_URL'),
        title,
        websocket_port: config.get('NOTIFIER_WEBSOCKET_PORT'),
    });
});

export default router;
