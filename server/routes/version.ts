import type { Response } from 'express';
import { Router } from 'express';
import * as path from 'node:path';

const router = Router();

router.get('/', async (_, res: Response) => {
    const asset = path.join(__dirname, '../public/version.txt');

    res.set('Content-Type', 'text/plain');

    res.sendFile(asset);
});

export default router;
