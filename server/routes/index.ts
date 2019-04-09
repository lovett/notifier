import * as express from 'express';
import PromiseRouter from 'express-promise-router';

const router = PromiseRouter();

/**
 * The homepage is an HTML shell that loads the client-side
 * application, which in turn decides which screen to display.
 */
router.get('/', async (req: express.Request, res: express.Response) => {
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
