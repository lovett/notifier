import { Response } from 'express';
import PromiseRouter from 'express-promise-router';
import * as path from 'path';

const router = PromiseRouter();

/**
 * The homepage is an HTML shell that loads the client-side
 * application, which in turn decides which screen to display.
 *
 * The relative path to the HTML file is only valid for the JS version
 * of this file within the build directory.
 */
router.get('/', async (_, res: Response) => {
    res.sendFile(path.resolve('public/index.html'));
});

export default router;
