import bodyParser from 'body-parser';
import childProcess from 'node:child_process';
import compression from 'compression';
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

const app = express();
const router = express.Router();

app.disable('x-powered-by');

app.enable('trust proxy');

app.locals.config = {
    NOTIFIER_BADGE_BASE_URL: process.env.NOTIFIER_BADGE_BASE_URL || '/svg',
    NOTIFIER_BASE_URL: process.env.NOTIFIER_BASE_URL || '/',
    NOTIFIER_DB_DSN: process.env.NOTIFIER_DB_DSN || 'socket://notifier@/var/run/postgresql?db=notifier',
    NOTIFIER_FORCE_HTTPS: process.env.NOTIFIER_FORCE_HTTPS || 0,
    NOTIFIER_HTTP_IP: process.env.NOTIFIER_HTTP_IP || '127.0.0.1',
    NOTIFIER_HTTP_PORT: process.env.NOTIFIER_HTTP_PORT || 8080,
    NOTIFIER_PUBLIC_DIR: process.env.NOTIFIER_PUBLIC_DIR || path.resolve(__dirname, './public'),
    NOTIFIER_TRUSTED_IPS: process.env.NOTIFIER_TRUSTED_IPS || '127.0.0.1',
};

app.locals.expirationCache = new Map();

app.locals.pushClients = new Map();

app.locals.maintenanceTimestamp = new Date();

app.use(security);

app.use(compression());

app.use(cookieParser());

app.use(bodyParser.urlencoded({
    extended: true,
    limit: '5kb',
}));

app.use(bodyParser.json({
    limit: '5kb',
}));

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

app.use(app.locals.config.NOTIFIER_BASE_URL, router);

app.use(jsonError);

/**
 * Command mode
 *
 * argv[0] is the node executable
 * argv[1] is the path to this file
 * argv[2] indicates a command
 * argv[3...] indicate command arguments
 */
if (process.argv.length > 2) {
    if (process.argv[2] === 'adduser' && process.argv.length === 5) {
        db.addUser(process.argv[3] || '', process.argv[4] || '').then(() => {
            console.log('User added');
        }).finally(() => {
            process.exit();
        });
    }
}
/**
 * Server mode
 */
if (process.argv.length < 3) {
    const server = app.listen(
        app.locals.config.NOTIFIER_HTTP_PORT,
        app.locals.config.NOTIFIER_HTTP_IP,
    );

    server.on('listening', async () => {
        process.stdout.write(`Listening on ${app.locals.config.NOTIFIER_HTTP_IP}:${app.locals.config.NOTIFIER_HTTP_PORT}\n`);

        app.locals.expirationCache = await db.getExpiringMessages();

        setInterval(scheduler, 1_000, app);

        // Tell systemd that startup has completed and all systems are go.
        if (process.env.NODE_ENV === 'production') {
            childProcess.exec(`/bin/systemd-notify --ready --pid=${process.pid}`);
        }
    });
}
