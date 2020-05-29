import * as bodyParser from 'body-parser';
import * as childProcess from 'child_process';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as nconf from 'nconf';
import * as path from 'path';

import * as db from './db';
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
import publishMessage from './helpers/publish-message';
import push from './routes/push';
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
});

app.disable('x-powered-by');

app.locals.config = nconf;

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

async function scheduler(): Promise<void> {
    const now = new Date();

    if (app.locals.expirationCache === undefined) {
        app.locals.expirationCache = await db.getExpiringMessages();
    }

    app.locals.expirationCache.forEach((value: [number, Date], key: string) => {
        const [userId, expiration] = value;
        if (expiration < now) {
            publishMessage(app, userId, null, key);
            app.locals.expirationCache.delete(key);
        }
    });

    const elapsedTime = now.getTime() - app.locals.maintenanceTimestamp.getTime();

    // Clean up old tokens once per hour.
    const oneHourMs = 1_000 * 60 * 60;
    if (elapsedTime / oneHourMs > 1) {
        await db.pruneStaleTokens();
        app.locals.maintenanceTimestamp = now;
    }
}

/**
 * Server startup
 */
if (!module.parent) {
    const server = app.listen(
        nconf.get('NOTIFIER_HTTP_PORT'),
        nconf.get('NOTIFIER_HTTP_IP'),
    );

    server.on('listening', () => {
        process.stdout.write(`Listening on ${nconf.get('NOTIFIER_HTTP_IP')}:${nconf.get('NOTIFIER_HTTP_PORT')}\n`);

        // Tell systemd that startup has completed and all systems are go.
        if (process.env.NODE_ENV === 'production') {
            childProcess.exec(`/bin/systemd-notify --ready --pid=${process.pid}`);
        }

        setInterval(scheduler, 2_000);

        db.createSchema().then(() => {
            db.addUser(
                nconf.get('NOTIFIER_DEFAULT_USER'),
                nconf.get('NOTIFIER_DEFAULT_USER_PASSWORD')
            );
        })
    });
}
