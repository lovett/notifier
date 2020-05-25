import { Response, Router } from 'express';
import * as path from 'path';

const router = Router();

/**
 * The homepage is an HTML shell that loads the JavaScript UI.
 */
router.get('/', async (_, res: Response) => {
    res.sendFile(path.resolve(__dirname, '../public/index.html'));
});

export default router;
