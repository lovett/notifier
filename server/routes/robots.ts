import * as express from 'express';

const router = express.Router();

/**
 * Render a robots.txt file
 *
 * This is handled through a route rather than a static file to reduce
 * the number of extraneous files in the site root.
 */
router.get('/', (req: express.Request, res: express.Response) => {
    res.type('txt');
    res.send('User-agent: *\nDisallow: /');
});

export default router;
