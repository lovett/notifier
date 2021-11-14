
import bodyParser from 'body-parser';
import childProcess from 'child_process';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import nconf from 'nconf';
import path from 'path';

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

/**
 * Application configuration
 *
 * Configuration is sourced from the following places, in order of
 * precedence:
 *
 * - Environment variables
 * - JSON file named after NODE_ENV
 * - JSON file named config.json
 * - JSON file in /etc
 * - Internal defaults
 */

nconf.env();

nconf.file('environment', path.join(__dirname, '../', 'config-' + process.env.NODE_ENV + '.json'));

nconf.file('application', path.join(__dirname, '../', 'config.json'));

nconf.file('host', '/etc/notifier.json');

nconf.defaults({
    NOTIFIER_BADGE_BASE_URL: '/svg',
    NOTIFIER_BASE_URL: '/',
    NOTIFIER_DB_DSN: 'postgres://notifier:notifier@localhost:5432/notifier',
    NOTIFIER_FORCE_HTTPS: 0,
    NOTIFIER_HTTP_IP: '127.0.0.1',
    NOTIFIER_HTTP_PORT: 8080,
    NOTIFIER_PUBLIC_DIR: path.resolve(__dirname, './public'),
    NOTIFIER_DEFAULT_USER: '',
    NOTIFIER_DEFAULT_USER_PASSWORD: '',
    NOTIFIER_TRUSTED_IPS: '127.0.0.1',
});

app.disable('x-powered-by');

app.enable('trust proxy');

app.locals.config = nconf;

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

db.connect(nconf.get('NOTIFIER_DB_DSN'));

/**
 * Routes
 */
router.use(asset(nconf.get('NOTIFIER_PUBLIC_DIR')));

router.use(/^\/(login|logout)?$/, index);

router.use('/deauth', deauth);

router.use('/services', verify, services);

router.use('/auth', auth);

router.use('/message', verify, message);

router.use('/archive', verify, archive);

router.use('/message/clear', verify, clear);

router.use('/message/unclear', verify, unclear);

router.use('/push', verify, push);

app.use(nconf.get('NOTIFIER_BASE_URL'), router);

app.use(jsonError);

/**
 * Server startup
 */
if (!module.parent) {
    const server = app.listen(
        nconf.get('NOTIFIER_HTTP_PORT'),
        nconf.get('NOTIFIER_HTTP_IP'),
    );

    server.on('listening', async () => {
        process.stdout.write(`Listening on ${nconf.get('NOTIFIER_HTTP_IP')}:${nconf.get('NOTIFIER_HTTP_PORT')}\n`);

        await db.createSchema();

        await db.addUser(
            nconf.get('NOTIFIER_DEFAULT_USER'),
            nconf.get('NOTIFIER_DEFAULT_USER_PASSWORD')
        );

        app.locals.expirationCache = await db.getExpiringMessages();

        setInterval(scheduler, 1_000, app);

        // Tell systemd that startup has completed and all systems are go.
        if (process.env.NODE_ENV === 'production') {
            childProcess.exec(`/bin/systemd-notify --ready --pid=${process.pid}`);
        }
    });
}
