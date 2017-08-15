import * as bodyParser from 'body-parser';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import * as crypto from 'crypto';
import * as express from 'express';
import * as fs from 'fs';
import * as https from 'https';
import * as nconf from 'nconf';
import * as passport from 'passport';
import * as path from 'path';
import * as responseTime from 'response-time';
import * as Sequelize from 'sequelize';

import Message from './models/Message';
import Token from './models/Token';
import User from './models/User';
import appCache from './routes/appcache';
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
import onedriveFinish from './routes/onedrive/finish';
import onedriveStart from './routes/onedrive/start';
import push from './routes/push';
import pushbulletFinish from './routes/pushbullet/finish';
import pushbulletStart from './routes/pushbullet/start';
import revoke from './routes/revoke';
import security from './middleware/security';
import services from './routes/services';
import status from './routes/status';
import validateCount from './validation/count';
import verifySubscription from './helpers/verify-subscription';

let app;
let router;
let sequelize;

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
    NOTIFIER_ACCESS_LOG: 'notifier.log',
    NOTIFIER_BASE_URL: '/',
    NOTIFIER_DB: path.resolve('./notifier.sqlite'),
    NOTIFIER_DB_BACKUP_DIR: undefined,
    NOTIFIER_DB_DIALECT: 'sqlite',
    NOTIFIER_DB_PASS: undefined,
    NOTIFIER_DB_USER: undefined,
    NOTIFIER_DEFAULT_PASSWORD: undefined,
    NOTIFIER_DEFAULT_USER: undefined,
    NOTIFIER_FORCE_HTTPS: 0,
    NOTIFIER_HTTP_IP: '127.0.0.1',
    NOTIFIER_HTTP_PORT: 8080,
    NOTIFIER_LIVERELOAD_HOST: undefined,
    NOTIFIER_LIVERELOAD_PORT: 35729,
    NOTIFIER_LOG_QUERIES: 0,
    NOTIFIER_PASSWORD_HASH_ITERATIONS: 20000,
    NOTIFIER_PASSWORD_HASH_KEYLENGTH: 64,
    NOTIFIER_PASSWORD_HASH_RANDBYTES: 64,
    NOTIFIER_PUBLIC_DIR: path.resolve('./public'),
    NOTIFIER_APP_DIR: path.resolve('./app'),
    NOTIFIER_LESS_DIR: path.resolve('./app/less'),
    NOTIFIER_PUSHBULLET_CLIENT_ID: undefined,
    NOTIFIER_PUSHBULLET_CLIENT_SECRET: undefined,
    NOTIFIER_SSL_CERT: undefined,
    NOTIFIER_SSL_KEY: undefined,
    ONEDRIVE_AUTH_FILE: undefined,
    ONEDRIVE_CLIENT_ID: undefined,
    ONEDRIVE_CLIENT_SECRET: undefined,
    ONEDRIVE_PATH: undefined,
    ONEDRIVE_REDIRECT: undefined,
    ONEDRIVE_RETAIN_DAYS: 3,
});

app = express();

app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'ejs');

app.disable('x-powered-by');

app.locals.config = nconf;

app.locals.appsecret = crypto.randomBytes(app.locals.config.get('NOTIFIER_PASSWORD_HASH_RANDBYTES')).toString('hex');

app.locals.protected = passport.authenticate(['cookie', 'basic', 'local'], { session: false });

app.locals.pushClients = {};

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
if (nconf.get('NOTIFIER_DB_DIALECT') === 'sqlite') {
    sequelize = new Sequelize(null, null, null, {
        dialect: nconf.get('NOTIFIER_DB_DIALECT'),
        logging: () => { return; },
        storage: nconf.get('NOTIFIER_DB'),
    });
}

app.locals.Token = Token(sequelize, app);
app.locals.User = User(sequelize, app);
app.locals.Message = Message(sequelize);

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

router.use(/^\/(login|logout|onedrive)?$/, index);

router.use('/notifier.appcache', appCache);

router.use('/status', status);

router.use('/deauth', deauth);

router.use('/services', app.locals.protected, services);

router.use('/revoke', app.locals.protected, revoke);

router.use('/authorize/onedrive/start', app.locals.protected, onedriveStart);

router.use('/authorize/onedrive/finish', onedriveFinish);

router.use('/authorize/pushbullet/start', app.locals.protected, pushbulletStart);

router.use('/authorize/pushbullet/finish', pushbulletFinish);

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

    sequelize.sync()
        .then(() => createUser(app))
        .then(() => {
            let server;

            if (app.locals.config.get('NOTIFIER_SSL_CERT')) {
                server = https.createServer({
                    cert: fs.readFileSync(nconf.get('NOTIFIER_SSL_CERT')),
                    key: fs.readFileSync(nconf.get('NOTIFIER_SSL_KEY')),
                }, app).listen(nconf.get('NOTIFIER_HTTP_PORT'), nconf.get('NOTIFIER_HTTP_IP'));
            } else {
                server = app.listen(nconf.get('NOTIFIER_HTTP_PORT'), nconf.get('NOTIFIER_HTTP_IP'));
            }

            server.on('listening', () => {
                process.stdout.write(`Listening on ${nconf.get('NOTIFIER_HTTP_IP')}:${nconf.get('NOTIFIER_HTTP_PORT')}\n`);
            });
        })
        .catch((err) => {
            process.stderr.write(err + '\\n');
            process.exit();
        });
}
