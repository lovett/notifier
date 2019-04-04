import * as express from 'express';

const router = express.Router();

/**
 * The homepage is an HTML shell that loads the client-side
 * application, which in turn decides which screen to display.
 */
router.get('/', (req: express.Request, res: express.Response) => {
    const config = req.app.locals.config;

    let title = 'Notifier';
    if (req.app.get('env') !== 'production') {
        title += ' ' + req.app.get('env');
    }

    res.render('index', {
        base_href: config.get('NOTIFIER_BASE_URL'),
        title,
    });
});

export default router;
