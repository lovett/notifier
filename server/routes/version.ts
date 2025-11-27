import type { Response } from 'express';
import { Router } from 'express';
import * as path from 'node:path';
import * as fs from 'node:fs';

const router = Router();

router.get('/', async (_, res: Response) => {
    const asset = path.join(__dirname, '../public/version.txt');

    res.set('Content-Type', 'text/plain');

    if (fs.existsSync(asset)) {
        res.sendFile(asset);
    } else {
        res.send('dev');
    }
});

export default router;
