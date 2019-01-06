import * as bodyParser from 'body-parser';
import * as childProcess from 'child_process';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import * as crypto from 'crypto';
import * as express from 'express';
import * as nconf from 'nconf';
import * as passport from 'passport';
import * as path from 'path';
import * as responseTime from 'response-time';
import * as Sequelize from 'sequelize';

import Message from './models/Message';
import Token from './models/Token';
import User from './models/User';
import archive from './routes/archive';
import asset from './middleware/asset';
import auth from './routes/auth';
import authCookie from './auth/cookie';
import authBasic from './auth/basic';
import authLocal from './auth/local';
import createUser from './helpers/create-user';
import deauth from './routes/deauth';
import favicon from './middleware/favicon';
import index from './routes/index';
import logger from './middleware/logger';
import messageClear from './routes/message/clear';
import messageIndex from './routes/message/index';
import messageUnclear from './routes/message/unclear';
import publishMessage from './helpers/publish-message';
import push from './routes/push';
import revoke from './routes/revoke';
import robots from './routes/robots';
import security from './middleware/security';
import services from './routes/services';
import status from './routes/status';
import validateCount from './validation/count';

let app: express.Application;
let router: express.Router;
let sequelize: Sequelize.Sequelize;

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

nconf.file('environment', path.join(__dirname, '../../', 'config-' + process.env.NODE_ENV + '.json'));

nconf.file('application', path.join(__dirname, '../../', 'config.json'));

nconf.file('host', '/etc/notifier.json');

nconf.defaults({
    NOTIFIER_ACCESS_LOG: path.resolve('./notifier.log'),
    NOTIFIER_APP_DIR: path.resolve('./app'),
    NOTIFIER_BADGE_BASE_URL: '/svg',
    NOTIFIER_BASE_URL: '/',
    NOTIFIER_DB_DSN: 'postgres://notifier:notifier@localhost:5432/notifier',
    NOTIFIER_DEFAULT_PASSWORD: undefined,
    NOTIFIER_DEFAULT_USER: undefined,
    NOTIFIER_FORCE_HTTPS: 0,
    NOTIFIER_HTTP_IP: '127.0.0.1',
    NOTIFIER_HTTP_PORT: 8080,
    NOTIFIER_LIVERELOAD_HOST: undefined,
    NOTIFIER_LIVERELOAD_PORT: 35729,
    NOTIFIER_PASSWORD_HASH_ITERATIONS: 20000,
    NOTIFIER_PASSWORD_HASH_KEYLENGTH: 64,
    NOTIFIER_PASSWORD_HASH_RANDBYTES: 64,
    NOTIFIER_PUBLIC_DIR: path.resolve('./build/public'),
});

app = express();

app.set('views', path.resolve('./build/views'));

app.set('view engine', 'ejs');

app.disable('x-powered-by');

app.locals.config = nconf;

app.locals.appsecret = crypto.randomBytes(app.locals.config.get('NOTIFIER_PASSWORD_HASH_RANDBYTES')).toString('hex');
app.locals.protected = passport.authenticate(['cookie', 'basic', 'local'], { session: false });

app.locals.pushClients = {};

app.locals.expirationCache = {};

app.use(logger(nconf.get('NOTIFIER_ACCESS_LOG')));

app.use(favicon(nconf.get('NOTIFIER_PUBLIC_DIR')));

app.use(security);

app.use(responseTime());

app.use(compression());

app.use(cookieParser());

app.use(bodyParser.urlencoded({
    extended: true,
    limit: '5kb',
}));

app.use(bodyParser.json({
    limit: '5kb',
}));

app.param('count', validateCount);

/**
 * Database configuration
 */
sequelize = new Sequelize(nconf.get('NOTIFIER_DB_DSN'), {
    // This silences a deprecation warning at startup about string based operators
    // even if they aren't actually any being used.
    operatorsAliases: false,

    pool: {
        max: 10,
        min: 3,
    },

    // To re-enable logging, set this to console.log
    logging: false,
});

app.locals.Token = Token(sequelize);
app.locals.User = User(sequelize, app);

app.locals.Message = Message(
    sequelize,
    app.locals.config.get('NOTIFIER_BADGE_BASE_URL').replace(/\/$/, ''),
);

app.locals.Token.belongsTo(app.locals.User);
app.locals.User.hasMany(app.locals.Token);
app.locals.User.hasMany(app.locals.Message);
app.locals.Message.belongsTo(app.locals.User);

/**
 * Routes
 */
passport.use(authLocal(app));

passport.use(authBasic(app));

passport.use(authCookie(app));

app.use(passport.initialize());

router = express.Router();

router.use(asset(nconf.get('NOTIFIER_PUBLIC_DIR')));

router.use(/^\/(login|logout)?$/, index);

router.use('/robots.txt', robots);

router.use('/status', status);

router.use('/deauth', deauth);

router.use('/services', app.locals.protected, services);

router.use('/revoke', app.locals.protected, revoke);

router.use('/auth', passport.authenticate('local', { session: false }), auth);

router.use('/message', app.locals.protected, messageIndex);

router.use('/archive', app.locals.protected, archive);

router.use('/message/clear', app.locals.protected, messageClear);

router.use('/message/unclear', app.locals.protected, messageUnclear);

router.use('/push', app.locals.protected, push);

app.use(nconf.get('NOTIFIER_BASE_URL'), router);

/**
 * Server startup
 */
if (!module.parent) {

    setInterval(() => {
        if (Object.keys(app.locals.expirationCache).length === 0) {
            return;
        }

        const now = new Date();
        const cache = app.locals.expirationCache;
        Object.keys(cache).forEach((key) => {
            const user = cache[key][0];
            const expiration = cache[key][1];
            if (expiration < now) {
                publishMessage(app, user, null, key);
                delete app.locals.expirationCache[key];
            }
        });
    }, 2000);

    sequelize.sync()
        .then(() => createUser(app))
        .then(() => {
            return app.locals.Message.findAll({
                include: [{
                    model: app.locals.User,
                }],
                where: {
                    expiresAt: {
                        [Sequelize.Op.gt]: new Date(),
                    },
                    unread: true,
                },
            });
        })
        .then((messages) => {
            for (const message of messages) {
                app.locals.expirationCache[message.publicId] = [message.User, message.expiresAt];
            }
        })
        .then(() => {
            const port = nconf.get('NOTIFIER_HTTP_PORT');
            const ip = nconf.get('NOTIFIER_HTTP_IP');
            const server = app.listen(port, ip);

            server.on('listening', () => {
                process.stdout.write(`Listening on ${ip}:${port}\n`);
                childProcess.exec(`/bin/systemd-notify --ready --pid=${process.pid}`);
            });
        })
        .catch((err) => {
            process.stderr.write(err + '\\n');
            process.exit();
        });
}
