import type { Response } from 'express';
import { Router } from 'express';
import * as path from 'node:path';

const router = Router();

/**
 * The homepage is an HTML shell that loads the JavaScript UI.
 */
router.get('/', async (_, res: Response) => {
    res.sendFile(path.resolve(__dirname, '../public/index.html'));
});

export default router;
