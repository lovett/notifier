import * as Sequelize from "sequelize";
import * as bodyParser from "body-parser";
import * as compression from "compression";
import * as crypto from "crypto";
import * as express from "express";
import * as fs from "fs";
import * as https from "https";
import * as nconf from "nconf";
import * as passport from "passport";
import * as path from "path";
import * as responseTime from "response-time";

import Message from "./modules/models/Message";
import Token from "./modules/models/Token";
import User from "./modules/models/User";
import appCache from "./modules/routes/appcache";
import archive from "./modules/routes/archive";
import asset from "./modules/middleware/asset";
import auth from "./modules/routes/auth";
import authBasic from "./modules/auth/basic";
import authLocal from "./modules/auth/local";
import createUser from "./modules/helpers/create-user";
import deauth from "./modules/routes/deauth";
import favicon from "./modules/middleware/favicon";
import index from "./modules/routes/index";
import logger from "./modules/middleware/logger";
import messageClear from "./modules/routes/message/clear";
import messageIndex from "./modules/routes/message/index";
import messageUnclear from "./modules/routes/message/unclear";
import onedriveFinish from "./modules/routes/onedrive/finish";
import onedriveStart from "./modules/routes/onedrive/start";
import pushbulletFinish from "./modules/routes/pushbullet/finish";
import pushbulletStart from "./modules/routes/pushbullet/start";
import revoke from "./modules/routes/revoke";
import security from "./modules/middleware/security";
import services from "./modules/routes/services";
import status from "./modules/routes/status";
import validateCount from "./modules/validation/count";
import verifySubscription from "./modules/helpers/verify-subscription";

let app, bayeux, deflate, faye, router, sequelize, sequelizeLogger;

deflate = require('permessage-deflate');
faye = require('faye');

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

nconf.file('environment', path.join(__dirname, 'config-' + process.env.NODE_ENV + '.json'));

nconf.file('application', path.join(__dirname, 'config.json'));

nconf.file('host', '/etc/notifier.json');

nconf.defaults({
    'NOTIFIER_LOG_QUERIES': 0,
    'NOTIFIER_ACCESS_LOG': 'notifier.log',
    'NOTIFIER_BASE_URL': '/',
    'NOTIFIER_PASSWORD_HASH_RANDBYTES': 64,
    'NOTIFIER_PASSWORD_HASH_KEYLENGTH': 64,
    'NOTIFIER_PASSWORD_HASH_ITERATIONS': 20000,
    'NOTIFIER_PUBLIC_DIR': path.resolve('./public'),
    'NOTIFIER_LIVERELOAD_HOST': undefined,
    'NOTIFIER_LIVERELOAD_PORT': 35729,
    'NOTIFIER_SSL_KEY': undefined,
    'NOTIFIER_SSL_CERT': undefined,
    'NOTIFIER_HTTP_IP': '127.0.0.1',
    'NOTIFIER_HTTP_PORT': 8080,
    'NOTIFIER_WEBSOCKET_PORT': 8080,
    'NOTIFIER_FORCE_HTTPS': 0,
    'NOTIFIER_DEFAULT_USER': undefined,
    'NOTIFIER_DEFAULT_PASSWORD': undefined,
    'NOTIFIER_DB_BACKUP_DIR': undefined,
    'NOTIFIER_PUSHBULLET_CLIENT_ID': undefined,
    'NOTIFIER_PUSHBULLET_CLIENT_SECRET': undefined,
    'NOTIFIER_DB_DIALECT': 'sqlite',
    'NOTIFIER_DB_USER': undefined,
    'NOTIFIER_DB_PASS': undefined,
    'NOTIFIER_DB': path.resolve('./notifier.sqlite'),
    'ONEDRIVE_AUTH_FILE': undefined,
    'ONEDRIVE_CLIENT_ID': undefined,
    'ONEDRIVE_CLIENT_SECRET': undefined,
    'ONEDRIVE_PATH': undefined,
    'ONEDRIVE_REDIRECT': undefined,
    'ONEDRIVE_RETAIN_DAYS': 3
});

app = express();

app.set('view engine', 'ejs');

app.disable('x-powered-by');

app.locals.config = nconf;

app.locals.appsecret = crypto.randomBytes(app.locals.config.get('NOTIFIER_PASSWORD_HASH_RANDBYTES')).toString('hex');

app.locals.protected = passport.authenticate('basic', { session: false });

app.use(logger(nconf.get('NOTIFIER_ACCESS_LOG')));

app.use(favicon(nconf.get('NOTIFIER_PUBLIC_DIR')));

app.use(security);

app.use(responseTime());

app.use(compression());

app.use(bodyParser.urlencoded({
    extended: true,
    limit: '5kb'
}));

app.use(bodyParser.json({
    limit: '5kb'
}));

app.param('count', validateCount);

/**
 * Database configuration
 */
sequelizeLogger = function () { };

if (parseInt(nconf.get('NOTIFIER_LOG_QUERIES'), 10) === 1) {
    // eslint-disable-next-line no-console
    sequelizeLogger = console.log;
}

if (nconf.get('NOTIFIER_DB_DIALECT') === 'sqlite') {
    sequelize = new Sequelize(null, null, null, {
        'dialect': nconf.get('NOTIFIER_DB_DIALECT'),
        'storage': nconf.get('NOTIFIER_DB'),
        'logging': sequelizeLogger
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
 * Websocket configuation
 *
 * Websocket clients must provide a token during subscription to
 * ensure the client is logged in. They must also provide a secret
 * known only by the server and its clients in order to publish
 * websocket messages.
 */
bayeux = new faye.NodeAdapter({
    mount: nconf.get('NOTIFIER_BASE_URL') + 'messages'
});

bayeux.addWebsocketExtension(deflate);

bayeux.addExtension({
    outgoing: function (message, callback) {
        // the localId is not sent to clients
        delete message.localId;

        return callback(message);
    },

    incoming: function (message, callback) {
        message.ext = message.ext || {};

        // Subscriptions must be accompanied by a token
        if (message.channel === '/meta/subscribe') {
            return verifySubscription(app, message, callback);
        }

        // Other meta messages are allowed (handshake, etc)
        if (message.channel.indexOf('/meta/') === 0) {
            return callback(message);
        }

        // Anything else must have the application secret
        if (message.ext.secret !== app.locals.appsecret) {
            message.error = '403::Forbidden';
        }

        // The application secret should never be revealed
        delete message.ext.secret;

        return callback(message);
    }
});

app.locals.bayeuxClient = bayeux.getClient();

app.locals.bayeuxClient.addExtension({
    outgoing: function (message, callback) {
        message.ext = message.ext || {};
        message.ext.secret = app.locals.appsecret;
        callback(message);
    }
});


/**
 * Routes
 */
passport.use(authLocal(app));

passport.use(authBasic(app));

app.use(passport.initialize());

router = express.Router();

router.use(asset(nconf.get('NOTIFIER_PUBLIC_DIR')));

router.use(/^\/(login|logout|onedrive)?$/, index);

router.use('/notifier.appcache', appCache);

router.use('/status', status);

router.use('/deauth', app.locals.protected, deauth);

router.use('/services', app.locals.protected, services);

router.use('/revoke', app.locals.protected, revoke);

router.use('/authorize/onedrive/start', app.locals.protected, onedriveStart);

router.use('/authorize/onedrive/finish', onedriveFinish);

router.use('/authorize/pushbullet/start', app.locals.protected, pushbulletStart);

router.use('/authorize/pushbullet/finish', pushbulletFinish);

router.use('/auth', passport.authenticate('local', { session: false }), auth);

router.use('/message', app.locals.protected, messageIndex);

router.use('/archive', app.locals.protected, archive);

router.use('/message/unclear', app.locals.protected, messageUnclear);

router.use('/message/clear', app.locals.protected, messageClear);

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
                    key: fs.readFileSync(nconf.get('NOTIFIER_SSL_KEY')),
                    cert: fs.readFileSync(nconf.get('NOTIFIER_SSL_CERT'))
                }, app).listen(nconf.get('NOTIFIER_HTTP_PORT'), nconf.get('NOTIFIER_HTTP_IP'));
            } else {
                server = app.listen(nconf.get('NOTIFIER_HTTP_PORT'), nconf.get('NOTIFIER_HTTP_IP'));
            }

            server.on('listening', () => {
                process.stdout.write(`Listening on ${nconf.get('NOTIFIER_HTTP_IP')}:${nconf.get('NOTIFIER_HTTP_PORT')}\n`);
                // Attach to the express server returned by listen, rather than app itself.
                // https://github.com/faye/faye/issues/256
                bayeux.attach(server);
            });
        })
        .catch((err) => {
            process.stderr.write(err + '\\n');
            process.exit();
        });
}