'use strict';
var Sequelize = require('sequelize'),
    accessLog,
    app,
    auth = {
        basic: require('./auth/basic.js'),
        local: require('./auth/local.js')
    },
    bayeux,
    bayeuxClient,
    bodyParser = require('body-parser'),
    compression = require('compression'),
    createUser,
    crypto = require('crypto'),
    dateparser = require('dateparser'),
    deflate = require('permessage-deflate'),
    ejs = require('ejs'),
    express = require('express'),
    faye = require('faye'),
    fs = require('fs'),
    https = require('https'),
    middleware = {
        favicon:  require('./middleware/favicon'),
        logger:   require('./middleware/logger'),
        security: require('./middleware/security'),
        asset:    require('./middleware/asset')
    },
    models = {
        Message: require('./models/Message'),
        User: require('./models/User'),
        Token: require('./models/Token'),
    },
    nconf = require('nconf'),
    needle = require('needle'),
    passport = require('passport'),
    path = require('path'),
    publishMessage,
    responseTime = require('response-time'),
    router,
    routes = {
        auth: require('./routes/auth'),
        archive: require('./routes/archive'),
        deauth: require('./routes/deauth'),
        index: require('./routes/index'),
        message: {
            index: require('./routes/message/index'),
            clear: require('./routes/message/clear'),
            unclear: require('./routes/message/unclear')
        },
        pushbullet: {
            start: require('./routes/pushbullet/start'),
            finish: require('./routes/pushbullet/finish')
        },
        revoke: require('./routes/revoke'),
        status: require('./routes/status'),
        services: require('./routes/services')
    },
    sequelize,
    sequelizeLogger,
    sync,
    url = require('url'),
    useragent = require('useragent'),
    util = require('util'),
    validation = {
        count: require('./validation/count'),
        sanitize: require('./validation/sanitize')
    },
    verifySubscription;

/**
 * Application configuration
 *
 * Configuration is sourced from multiple places. Whichever one
 * provides a value first wins.
 *
 * - Environment variables
 * - JSON file named after NODE_ENV
 * - JSON file named config.json
 * - JSON file in /etc
 * - Internal defaults
 */

nconf.env();

nconf.file('environment', path.resolve(__dirname + '/config-' + process.env.NODE_ENV + '.json'));

nconf.file('application', path.resolve(__dirname + '/config.json'));

nconf.file('host', '/etc/notifier.json');

nconf.defaults({
    'NOTIFIER_LOG_QUERIES': 0,
    'NOTIFIER_ACCESS_LOG': 'notifier.log',
    'NOTIFIER_BASE_URL': '/',
    'NOTIFIER_PASSWORD_HASH_RANDBYTES': 64,
    'NOTIFIER_PASSWORD_HASH_KEYLENGTH': 64,
    'NOTIFIER_PASSWORD_HASH_ITERATIONS': 20000,
    'NOTIFIER_PUBLIC_DIR': path.resolve(__dirname + '/../public'),
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
    'NOTIFIER_DB': path.resolve(__dirname + '/../notifier.sqlite'),
    'ONEDRIVE_AUTH_FILE': undefined,
    'ONEDRIVE_CLIENT_ID': undefined,
    'ONEDRIVE_CLIENT_SECRET': undefined,
    'ONEDRIVE_PATH': undefined,
    'ONEDRIVE_REDIRECT': undefined,
    'ONEDRIVE_RETAIN_DAYS': 3
});

/**
 * The Express application
 * --------------------------------------------------------------------
 */
app = express();

app.set('view engine', 'ejs');

app.disable('x-powered-by');

app.locals.config = nconf;

app.locals.appsecret = crypto.randomBytes(60).toString('hex');

app.locals.protected = passport.authenticate('basic', { session: false });

app.use(middleware.logger(nconf.get('NOTIFIER_ACCESS_LOG')));

app.use(middleware.favicon(nconf.get('NOTIFIER_PUBLIC_DIR')));

app.use(middleware.security);

app.use(responseTime());

app.use(compression());


/**
 * Database configuration
 * --------------------------------------------------------------------
 */

sequelizeLogger = function () {};
if (parseInt(nconf.get('NOTIFIER_LOG_QUERIES'), 10) === 1) {
    sequelizeLogger = console.log;
}

if (nconf.get('NOTIFIER_DB_DIALECT') === 'sqlite') {

    sequelize = new Sequelize(null, null, null, {
        'dialect': nconf.get('NOTIFIER_DB_DIALECT'),
        'storage': nconf.get('NOTIFIER_DB'),
        'logging': sequelizeLogger
    });
}

app.locals.Token = models.Token(sequelize, app);
app.locals.User = models.User(sequelize, app);
app.locals.Message = models.Message(sequelize, app);

app.locals.Token.belongsTo(app.locals.User);
app.locals.User.hasMany(app.locals.Token);
app.locals.User.hasMany(app.locals.Message);

app.locals.Message.belongsTo(app.locals.User);


/**
 * Database population
 * --------------------------------------------------------------------
 */
createUser = function (username, password, callback) {
    app.locals.User.findOrCreate({ where: {username: username}}).spread(function (user, created) {
        if (created === false) {
            callback();
        } else {
            user.hashPassword(password, function () {
                user.save().then(function () {
                    callback();
                }, function (err) {
                    callback(err);
                });
            });
        }
    }, function (err) {
        callback(err);
    });
};

/**
 * Websocket setup
 * --------------------------------------------------------------------
 */
bayeux = new faye.NodeAdapter({
    mount: nconf.get('NOTIFIER_BASE_URL') + 'messages'
});

bayeux.addWebsocketExtension(deflate);

/**
 * Websocket helpers
 * --------------------------------------------------------------------
 */
verifySubscription = function (message, callback) {
    //console.log({message: message}, 'verifying subscription request');

    if (!message.ext || !message.ext.authToken) {
        message.error = '401::Credentials missing';
        callback(message);
        return;
    }

    function tokenNotFound () {
        message.error = '500::Unable to verify credentials at this time';
        callback(message);
        return;
    }

    function tokenFound (token) {
        var channelSegments, tokenAge;

        if (!token || !token.User) {
            message.error = '401::Invalid Credentials';
            callback(message);
            return;
        }

        // Is the requested channel still valid?
        channelSegments = message.subscription.replace(/^\//, '').split('/');

        if (channelSegments[0] !== 'messages') {
            //console.log({channel: message.subscription}, 'invalid channel');
            message.error = '400::Invalid subscription channel';
            callback(message);
            return;
        }

        if (channelSegments[1] !== token.User.getChannel()) {
            //console.log({channel: message.subscription}, 'stale channel');
            message.error = '301::' + token.User.getChannel();
            callback(message);
            return;
        }

        // Advance the token updatedAt value
        token.setDataValue('updatedAt', new Date());
        token.save().then(function () {
            callback(message);
        });
    }

    app.locals.Token.find({
        include: [ app.locals.User ],
        where: {
            value: message.ext.authToken
        }
    }).then(tokenFound, tokenNotFound);
};


/**
 * Websocket authorization
 * --------------------------------------------------------------------
 * Websocket clients must provide a token during subscription to
 * ensure the client is logged in. They must also provide a secret
 * known only by the server and its clients in order to publish
 * websocket messages.
 */
bayeux.addExtension({
    outgoing: function (message, callback) {
        // the localId is not sent to clients
        delete message.localId;

        //console.log({message: message}, 'faye server outgoing message');
        return callback(message);
    },

    incoming: function(message, callback) {

        //console.log({message: message}, 'faye server incoming message');

        message.ext = message.ext || {};

        // Subscriptions must be accompanied by a token
        if (message.channel === '/meta/subscribe') {
            verifySubscription(message, callback);
            return;
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

/**
 * Serverside websocket client configuration
 * --------------------------------------------------------------------
 * Add the application secret to outgoing messages
 */
bayeuxClient = bayeux.getClient();

bayeuxClient.addExtension({
    outgoing: function(message, callback) {
        //console.log({message: message}, 'faye server-side client outgoing message');
        message.ext = message.ext || {};
        message.ext.secret = app.locals.appsecret;
        callback(message);
    }
});

// Parse urlencoded request bodies
app.use(bodyParser.urlencoded({
    extended: true,
    limit: '5kb'
}));

// Parse json request bodies
app.use(bodyParser.json({
    limit: '5kb'
}));

passport.use(auth.local(app));
passport.use(auth.basic(app));

app.use(passport.initialize());

app.param('count', validation.count);


/**
 * Route helpers
 * --------------------------------------------------------------------
 */
publishMessage = function (user, message) {
    var channel = '/messages/' + user.getChannel();

    bayeuxClient.publish(channel, JSON.stringify(message));

    user.getServiceTokens(function (tokens) {
        var pushbulletParams;

        if (!user.serviceTokens.hasOwnProperty('pushbullet')) {
            return;
        }

        if (message.pushbulletId === '0') {
            return;
        }

        if (message.hasOwnProperty('retracted')) {
            app.locals.Message.find({
                where: {'publicId': message.retracted},
                attributes: ['pushbulletId']
            }).then(function (message) {
                if (message.pushbulletId === '0') {
                    return;
                }
                needle.delete('https://api.pushbullet.com/v2/pushes/' + message.pushbulletId, null, {
                    'username': user.serviceTokens.pushbullet,
                    'password': ''
                });
            });
        } else {

            if (message.url) {
                pushbulletParams = {
                    'type': 'link',
                    'title': message.title,
                    'body': message.body,
                    'url': message.url
                };
            } else {
                pushbulletParams = {
                    'type': 'note',
                    'title': message.title,
                    'body': message.body
                };
            }

            needle.post('https://api.pushbullet.com/v2/pushes', pushbulletParams, {
                'username': user.serviceTokens.pushbullet,
                'password': ''
            }, function (err, res) {
                if (res.body.error) {
                    console.error({err: res.body.error}, 'pushbullet error');
                    return;
                }

                app.locals.Message.update(
                    {pushbulletId: res.body.iden},
                    {where: {id: message.id}}
                );
            });
        }
    });
};


router = express.Router();

router.use(middleware.asset(nconf.get('NOTIFIER_PUBLIC_DIR')));

router.use(/^\/(login|logout|onedrive)?$/, routes.index);

router.use('/status', routes.status);

router.use('/deauth', app.locals.protected, routes.deauth);

router.use('/services', app.locals.protected, routes.services);

router.use('/revoke', app.locals.protected, routes.revoke);

router.get('/authorize/onedrive/start', app.locals.protected, function (req, res) {
    var endpoint = url.parse('https://login.live.com/oauth20_authorize.srf');

    // this endpoint can only be accessed by the default user
    if (req.user.username !== nconf.get('NOTIFIER_DEFAULT_USER')) {
        res.sendStatus(400);
        return;
    }

    endpoint.query = {
        'client_id': nconf.get('ONEDRIVE_CLIENT_ID'),
        'scope': 'wl.offline_access onedrive.readwrite',
        'response_type': 'code',
        'redirect_uri': nconf.get('ONEDRIVE_REDIRECT')
    };

    res.json({
        url: url.format(endpoint)
    });
});

router.get('/authorize/onedrive/finish', function (req, res) {
    if (!req.query.code) {
        res.sendStatus(400);
        return;
    }
    needle.post('https://login.live.com/oauth20_token.srf', {
        'client_id': nconf.get('ONEDRIVE_CLIENT_ID'),
        'redirect_uri': nconf.get('ONEDRIVE_REDIRECT'),
        'client_secret': nconf.get('ONEDRIVE_CLIENT_SECRET'),
        'code': req.query.code,
        'grant_type': 'authorization_code'
    }, function (err, resp) {
        if (err) {
            res.send(500);
            return;
        }

        if (resp.body.error) {
            res.status(400).json(resp.body);
            return;
        }

        fs.writeFile(nconf.get('ONEDRIVE_AUTH_FILE'), JSON.stringify(resp.body), function (err) {
            if (err) {
                res.sendStatus(500);
            } else {
                res.redirect(nconf.get('NOTIFIER_BASE_URL'));
            }
        });

    });
});

router.use('/authorize/pushbullet/start', app.locals.protected, routes.pushbullet.start);

router.use('/authorize/pushbullet/finish', routes.pushbullet.finish);

router.use('/auth', passport.authenticate('local', { session: false }), routes.auth);

router.use('/message', app.locals.protected, routes.message.index);

router.use('/archive', app.locals.protected, routes.archive);

router.use('/message/unclear', app.locals.protected, routes.message.unclear);

router.use('/message/clear', app.locals.protected, routes.message.clear);

app.use(nconf.get('NOTIFIER_BASE_URL'), router);


/**
 * Error handling
 * --------------------------------------------------------------------
 *
 * This should come after all other routes and middleware.
 *
 * The 'next' argument is only specified so that Express treats this
 * as an error handler. Calling it after sending a response will
 * trigger "Can't set headers after they are sent", but not including
 * it at all will make express treat this as regular middleware.
 */
app.use(function(err, req, res, next) {
    if (err && err.status && err.message) {
        res.status(err.status).send({message: err.message});
    } else if (err) {
        res.status(500).send({message: err});
    } else {
        next();
    }
});


/**
 * Server startup
 * --------------------------------------------------------------------
 */
sync = function (callback) {
    sequelize.sync().then(function () {
        var password, user;
        if (nconf.get('NOTIFIER_DEFAULT_USER')) {
            user = nconf.get('NOTIFIER_DEFAULT_USER').toLowerCase();
            password = nconf.get('NOTIFIER_DEFAULT_PASSWORD');

            createUser(user, password, function (err) {
                if (err) {
                    console.error(err);
                    process.exit();
                }
                callback();
            });
        }
        return null;
    }).catch(function (err) {
        console.error(err);
        process.exit();
    });
};


if (!module.parent) {
    sync(function () {
        var server;
        if (nconf.get('NOTIFIER_SSL_CERT')) {
            server = https.createServer({
                key: fs.readFileSync(nconf.get('NOTIFIER_SSL_KEY')),
                cert: fs.readFileSync(nconf.get('NOTIFIER_SSL_CERT'))
            }, app).listen(nconf.get('NOTIFIER_HTTP_PORT'), nconf.get('NOTIFIER_HTTP_IP'));
        } else {
            server = app.listen(nconf.get('NOTIFIER_HTTP_PORT'), nconf.get('NOTIFIER_HTTP_IP'));
        }

        server.on('listening', function () {
            //console.log({ip: nconf.get('NOTIFIER_HTTP_IP'), port: nconf.get('NOTIFIER_HTTP_PORT')}, 'appstart');

            // Attach to the express server returned by listen, rather than app itself.
            // https://github.com/faye/faye/issues/256
            bayeux.attach(server);
        });
    });
}

// These exports are all for the benefit of testing
exports.sync = sync;
exports.app = app;
exports.bayeuxClient = bayeuxClient;
exports.verifySubscription = verifySubscription;
exports.createUser = createUser;
exports.nconf = nconf;
