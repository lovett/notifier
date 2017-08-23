import * as express from 'express';
import * as glob from 'glob';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const router = express.Router();

function hashOneFile(filePath, algorithm) {
    const hash = crypto.createHash(algorithm);
    const rs = fs.createReadStream(filePath);

    return new Promise((resolve, reject) => {
        rs.on('error', reject);
        rs.on('data', (chunk) => hash.update(chunk));
        rs.on('end', () => resolve(hash.digest('hex')));
    });
}

function errorHandler(res, err) {
    console.error(err);
    res.status(500).send('Unable to generate cache manifest');
}

router.get('/', (req: express.Request, res: express.Response) => {
    const globPattern = path.join(
        req.app.locals.config.get('NOTIFIER_PUBLIC_DIR'),
        '**/*',
    );

    glob(globPattern, {nodir: true}, (globErr, files: string[]) => {
        if (globErr) {
            errorHandler(res, globErr);
            return;
        }

        const hashAlgorithm = 'md5';
        const hashOfHashes = crypto.createHash(hashAlgorithm);
        const promises = files.map((file) => hashOneFile(file, hashAlgorithm));

        Promise.all(promises)
            .then((values: string[]) => {
                for (const value of values) {
                    hashOfHashes.update(value);
                }

                res.type('appcache');
                res.render('appCache', { digest: hashOfHashes.digest('hex') });
            })
            .catch((promiseError) => errorHandler(res, promiseError));
    });
});

export default router;
