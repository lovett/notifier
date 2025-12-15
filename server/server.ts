import bodyParser from 'body-parser';
import childProcess from 'node:child_process';
import cookieParser from 'cookie-parser';
import express from 'express';
import path from 'node:path';

import db from './db';
import archive from './routes/archive';
import asset from './middleware/asset';
import auth from './routes/auth';
import deauth from './routes/deauth';
import index from './routes/index';
import jsonError from './middleware/error-json';
import clear from './routes/clear';
import message from './routes/message';
import unclear from './routes/unclear';
import noBlanks from './middleware/no-blanks';
import push from './routes/push';
import scheduler from './scheduler';
import security from './middleware/security';
import services from './routes/services';
import verify from './middleware/verify';
import version from './routes/version';

const app = express();
const router = express.Router();

app.disable('x-powered-by');

app.enable('trust proxy');

app.locals.config = {
    NOTIFIER_BADGE_BASE_URL: process.env.NOTIFIER_BADGE_BASE_URL || '/svg',
    NOTIFIER_BASE_URL: process.env.NOTIFIER_BASE_URL || '/',
    NOTIFIER_DB_DSN:
        process.env.NOTIFIER_DB_DSN ||
        'socket://notifier@/var/run/postgresql?db=notifier',
    NOTIFIER_HTTP_PORT: process.env.NOTIFIER_HTTP_PORT || 8080,
    NOTIFIER_PUBLIC_DIR:
        process.env.NOTIFIER_PUBLIC_DIR || path.resolve(__dirname, './public'),
    NOTIFIER_TRUSTED_IPS:
        '127.0.0,::1,' + (process.env.NOTIFIER_TRUSTED_IPS || ''),
};

app.locals.expirationCache = new Map();

app.locals.pushClients = new Map();

app.locals.maintenanceTimestamp = new Date();

app.use(security);

app.use(cookieParser());

app.use(
    bodyParser.urlencoded({
        extended: true,
        limit: '5kb',
    }),
);

app.use(
    bodyParser.json({
        limit: '5kb',
    }),
);

app.use(noBlanks);

db.connect(app.locals.config.NOTIFIER_DB_DSN);

/**
 * Routes
 */
router.use(asset(app.locals.config.NOTIFIER_PUBLIC_DIR));

router.use(/^\/(login|logout)?$/, index);

router.use('/deauth', deauth);

router.use('/services', verify, services);

router.use('/auth', auth);

router.use('/message', verify, message);

router.use('/archive', verify, archive);

router.use('/message/clear', verify, clear);

router.use('/message/unclear', verify, unclear);

router.use('/push', verify, push);

router.use('/version', version);

app.use(app.locals.config.NOTIFIER_BASE_URL, router);

app.use(jsonError);

if (process.argv.length > 2) {
    /**
     * Command mode
     *
     * argv[0] is the bun executable
     * argv[1] is the path to this file
     * argv[2] indicates a command
     * argv[3...] indicate command arguments
     */
    switch (process.argv[2]) {
        case 'config':
            console.table(app.locals.config);
            break;

        case 'adduser':
            if (process.argv.length !== 5) {
                console.error('Missing username and password arguments');
                process.exit(1);
            }

            db.addUser(process.argv[3] || '', process.argv[4] || '')
                .then(() => {
                    console.log('User added');
                })
                .finally(() => {
                    process.exit();
                });
            break;

        default:
            console.error('Unknown command');
            process.exit(1);
    }
} else {
    /**
     * Server mode
     */
    console.info('Running with the following configuration:');
    console.table(app.locals.config);

    const server = app.listen(app.locals.config.NOTIFIER_HTTP_PORT);

    let schedulerInterval;

    server.on('listening', async () => {
        process.stdout.write(
            `Listening on port ${app.locals.config.NOTIFIER_HTTP_PORT}\n`,
        );

        app.locals.expirationCache = await db.getExpiringMessages();

        schedulerInterval = setInterval(scheduler, 1_000, app);
    });

    process.on('SIGTERM', () => {
        console.log(`\nSIGTERM received. Exiting...`);
        process.exit(0);
    });

    process.on('SIGINT', () => {
        console.log(`\nSIGINT received. Exiting...`);
        process.exit(0);
    });
}
