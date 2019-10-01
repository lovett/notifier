import { Response } from 'express';
import PromiseRouter from 'express-promise-router';
import * as path from 'path';

const router = PromiseRouter();

/**
 * The homepage is an HTML shell that loads the JavaScript UI.
 */
router.get('/', async (_, res: Response) => {
    res.sendFile(path.resolve(__dirname, '../public/index.html'));
});

export default router;
