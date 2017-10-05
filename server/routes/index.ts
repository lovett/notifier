import * as express from 'express';
import * as util from 'util';

const router = express.Router();

/**
 * The application homepage
 */
router.get('/', (req: express.Request, res: express.Response) => {
    let livereloadUrl: string = '';

    const config = req.app.locals.config;

    if (config.get('NOTIFIER_LIVERELOAD_HOST') && config.get('NOTIFIER_LIVERELOAD_PORT')) {
        livereloadUrl = util.format(
            '//%s:%d/livereload.js',
            config.get('NOTIFIER_LIVERELOAD_HOST'),
            config.get('NOTIFIER_LIVERELOAD_PORT'),
        );
    }

    let title = 'Notifier';
    if (req.app.get('env') && req.app.get('env') !== 'production') {
        title += ' ' + req.app.get('env');
    }

    res.render('index', {
        base_href: config.get('NOTIFIER_BASE_URL'),
        livereload_url: livereloadUrl,
        title,
        websocket_port: config.get('NOTIFIER_WEBSOCKET_PORT'),
    });
});

export default router;
