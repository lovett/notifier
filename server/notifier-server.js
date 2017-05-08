'use strict';
let Message = require('./models/Message'),
    Sequelize = require('sequelize'),
    Token = require('./models/Token'),
    User = require('./models/User'),
    app,
    archive = require('./routes/archive'),
    asset = require('./middleware/asset'),
    auth = require('./routes/auth'),
    authBasic = require('./auth/basic.js'),
    authLocal = require('./auth/local.js'),
    bayeux,
    bodyParser = require('body-parser'),
    compression = require('compression'),
    createUser = require('./helpers/create-user'),
    crypto = require('crypto'),
    deauth = require('./routes/deauth'),
    deflate = require('permessage-deflate'),
    express = require('express'),
    favicon = require('./middleware/favicon'),
    faye = require('faye'),
    fs = require('fs'),
    https = require('https'),
    index = require('./routes/index'),
    logger = require('./middleware/logger'),
    messageClear = require('./routes/message/clear'),
    messageIndex = require('./routes/message/index'),
    messageUnclear = require('./routes/message/unclear'),
    nconf = require('nconf'),
    onedriveFinish = require('./routes/onedrive/finish'),
    onedriveStart = require('./routes/onedrive/start'),
    passport = require('passport'),
    path = require('path'),
    pushbulletFinish = require('./routes/pushbullet/finish'),
    pushbulletStart = require('./routes/pushbullet/start'),
    responseTime = require('response-time'),
    revoke = require('./routes/revoke'),
    router,
    security = require('./middleware/security'),
    sequelize,
    sequelizeLogger,
    services = require('./routes/services'),
    status = require('./routes/status'),
    validateCount = require('./validation/count'),
    verifySubscription = require('./helpers/verify-subscription');

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
    'NOTIFIER_DEFAULT_USER': 'notifier',
    'NOTIFIER_DEFAULT_PASSWORD': 'notifier',
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
