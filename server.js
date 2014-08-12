var bunyan = require('bunyan');
var https = require('https');
var fs = require('fs');
var faye = require('faye');
var express = require('express');
var bodyParser = require('body-parser');
var responseTime = require('response-time');
var Sequelize = require('sequelize');
var bcrypt = require('bcrypt');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var crypto = require('crypto');
var compression = require('compression');
var util = require('util');
var useragent = require('useragent');
var nconf = require('nconf');
var sanitizeHtml = require('sanitize-html');

/**
 * Application configuration
 * --------------------------------------------------------------------
 *
 * Configuration settings are sourced from:
 *
 * 1. command line arguments
 * 2. environment variables
 * 3. the file env-{NODE_ENV}.json
 * 4. the file env.json
 * 5. default values
 */

nconf.argv();
nconf.env();

if (process.env.NODE_ENV) {
    nconf.file('custom', { file: 'env-' + process.env.NODE_ENV + '.json' });
}

nconf.file('env.json');

nconf.defaults({
    'NOTIFIER_LOG': 'notifier.log',
    'NOTIFIER_LOG_LEVEL': 'warn'
});

/**
 * Logging configuration
 * --------------------------------------------------------------------
 */
var log = bunyan.createLogger({
    name: 'notifier',
    streams: [
        {
            path: nconf.get('NOTIFIER_LOG'),
            level: nconf.get('NOTIFIER_LOG_LEVEL')
        }
    ],
    serializers: {
        req: bunyan.stdSerializers.req,
        res: bunyan.stdSerializers.res
    }
});

/**
 * Application secret
 * --------------------------------------------------------------------
 */
var APPSECRET;
try {
    APPSECRET = crypto.randomBytes(60).toString('hex');
    log.trace('app secret generated');
} catch (ex) {
    log.fatal('unable to generate app secret - entropy sources drained?');
    process.exit();
}


/**
 * ORM configuration
 * --------------------------------------------------------------------
 */

var dbConfig = nconf.get('NOTIFIER_DB_CONFIG');
dbConfig.logging = function (msg) {
    log.info({
        sequelize: msg
    }, 'query');
};

var sequelize = new Sequelize(nconf.get('NOTIFIER_DB_NAME'),
                              nconf.get('NOTIFIER_DB_USER'),
                              nconf.get('NOTIFIER_DB_PASS'),
                              dbConfig);

/**
 * HTML sanitizer configuration
 * --------------------------------------------------------------------
 */
var sanitizeStrictConfig = {
    allowedTags: [],
    allowedAttributes: {}
};

var sanitizeStrict = function (context, field, value) {
    var clean = sanitizeHtml(value, sanitizeStrictConfig);
    log.trace({field: field, before: value, after: clean}, 'sanitized');
    return context.setDataValue(field, clean);
};

var sanitizeTolerantConfig = {
    allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'p' ],
    allowedAttributes: {
        'a': [ 'href' ]
    },
    allowedSchemes: [ 'http', 'https', 'mailto' ]
};

var sanitizeTolerant = function (context, field, value) {
    var clean = sanitizeHtml(value, sanitizeTolerantConfig);
    log.trace({field: field, before: value, after: clean}, 'sanitized');
    return context.setDataValue(field, clean);
};


/**
 * ORM model definition
 * --------------------------------------------------------------------
 */
var User = sequelize.define('User', {
    username: {
        type: Sequelize.STRING(20),
        unique: true,
        allowNull: false,
        validate: {
            len: {
                args: [1, 20],
                msg: 'should be between 1 and 20 characters'
            }
        }
    },
    passwordHash: {
        type: Sequelize.STRING(60),
        allowNull: true,
        validate: {
            len: {
                args: [1, 60],
                msg: 'should be between 1 and 60 characters'
            }
        }
    }
}, {
    instanceMethods: {
        getChannel: function () {
            var hmac = crypto.createHmac('sha256', APPSECRET);
            hmac.setEncoding('hex');
            hmac.write(this.id.toString());
            hmac.end();
            return hmac.read();
        },

        hashPassword: function (password) {
            var salt = bcrypt.genSaltSync(10);
            var hash = bcrypt.hashSync(password, salt);
            this.setDataValue('passwordHash', hash);
        },

        checkPassword: function (password) {
            return bcrypt.compareSync(password, this.getDataValue('passwordHash'));
        }
    }
});

var Token = sequelize.define('Token', {
    value: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false
    },
    label: {
        type: Sequelize.STRING(100),
        allowNull: true,
        validate: {
            len: {
                args: [1, 100],
                msg: 'should be between 1 and 100 characters'
            }
        }
    }
}, {
    classMethods: {
        prune: function (callback) {
            Token.destroy({
                updatedAt: {
                    lt: new Date(new Date().getTime() - (60 * 60 * 24 * 1000))
                }
            }).success(function () {
                callback();
            });
        }
    }
});

var Message = sequelize.define('Message', {
    publicId: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false
    },
    title: {
        type: Sequelize.STRING(50),
        allowNull: false,
        validate: {
            len: {
                args: [1, 50],
                msg: 'should be between 1 and 50 characters'
            }
        },
        set: function (value) {
            return sanitizeStrict(this, 'title', value);
        }
    },
    url: {
        type: Sequelize.STRING(255),
        allowNull: true,
        validate: {
            isUrl: true,
            len: {
                args: [1, 255],
                msg: 'should be between 1 and 255 characters'
            }
        },
        set: function (value) {
            return sanitizeStrict(this, 'url', value);
        }
    },
    body: {
        type: Sequelize.STRING(500),
        allowNull: true,
        validate: {
            len: {
                args: [1,500],
                msg: 'should be between 1 and 500 characters'
            }
        },
        set: function (value) {
            return sanitizeTolerant(this, 'body', value);
        }
    },
    source: {
        type: Sequelize.STRING(20),
        allowNull: true,
        validate: {
            len: {
                args: [1,20],
                msg: 'should be between 1 and 20 characters'
            }
        },
        set: function (value) {
            return sanitizeStrict(this, 'source', value);
        }
    },
    group: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'default',
        validate: {
            len: {
                args: [1,20],
                msg: 'should be between 1 and 20 characters'
            }
        },
        set: function (value) {
            return sanitizeStrict(this, 'group', value);
        }
    },
    unread: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    instanceMethods: {
        isEmpty: function () {
            var fieldsWithDefaultValues = ['publicId', 'id', 'received', 'group'];
            var fieldsWithCustomValues = Object.keys(this.values).filter(function (key) {
                return (fieldsWithDefaultValues.indexOf(key) === -1) ;
            });

            return fieldsWithCustomValues.length === 0;
        }
    },

    timestamps: true,
    updatedAt: false,
    createdAt: 'received'
});

/**
 * ORM associations
 * --------------------------------------------------------------------
 */
User.hasMany(Token);
Token.belongsTo(User);

User.hasMany(Message);
Message.belongsTo(User);


/**
 * Database population
 * --------------------------------------------------------------------
 */
var createDefaultUser = function (callback) {
    if (!nconf.get('NOTIFIER_DEFAULT_USER')) {
        return callback();
    }

    var userName = nconf.get('NOTIFIER_DEFAULT_USER').toLowerCase();

    User.findOrCreate({ username: userName}).success(function (user, created) {
        if (created === false) {
            callback();
        } else {
            user.hashPassword(nconf.get('NOTIFIER_DEFAULT_PASSWORD'));
            user.save().success(function () {
                callback();
            }).error(function (err) {
                callback(err);
            });
        }
    }).error(function (err) {
        callback(err);
    });
};

/**
 * Authentication configuration
 * --------------------------------------------------------------------
 */
passport.use(new LocalStrategy(function (username, password, done) {

    // username is case insensitive
    // password is case sensitive
    username = username.toLowerCase();

    User.find({ where: { username: username } }).success(function (user) {
        if (!user) {
            return done(null, false);
        }

        if (!user.checkPassword(password)) {
            return done(null, false);
        }

        return done(null, user);
    }).error(function (error) {
        return done(error);
    });
}));


/**
 * Websocket setup
 * --------------------------------------------------------------------
 */
var bayeux = new faye.NodeAdapter({
    mount: '/messages',
    timeout: 45
});

/**
 * Websocket helpers
 * --------------------------------------------------------------------
 */
var verifySubscription = function (message, callback) {
    log.info({message: message}, 'verifying subscription request');

    if (!message.ext || !message.ext.authToken) {
        log.warn({message: message}, 'credentials missing');
        message.error = '401::Credentials missing';
        callback(message);
        return;
    }

    Token.find({
        include: [ User ],
        where: {
            value: message.ext.authToken
        }
    }).success(function (token) {
        if (!token) {
            log.warn({message: message}, 'invalid credentials');
            message.error = '401::Invalid Credentials';
            callback(message);
            return;
        }

        // Is the requested channel still valid?
        var channelSegments = message.subscription.replace(/^\//, '').split('/');

        if (channelSegments[0] !== 'messages') {
            log.info({channel: message.subscription}, 'invalid channel');
            message.error = '400::Invalid subscription channel';
            callback(message);
            return;
        }

        if (channelSegments[1] !== token.user.getChannel()) {
            log.info({channel: message.subscription}, 'stale channel');
            message.error = '301::' + token.user.getChannel();
            callback(message);
            return;
        }

        // Looks good
        log.info('subscription looks good');
        token.save([]).success(function () {
            callback(message);
        });

    }).error(function () {
        log.error({message: message}, 'token lookup failed');
        message.error = '500::Unable to verify credentials at this time';
        callback(message);
        return;
    });
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
        log.trace({message: message}, 'faye server outgoing message');
        return callback(message);
    },

    incoming: function(message, callback) {

        log.trace({message: message}, 'faye server incoming message');

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
        if (message.ext.secret !== APPSECRET) {
            log.warn({message: message}, 'suspicious message, no secret');
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
var bayeuxClient = bayeux.getClient();

bayeuxClient.addExtension({
    outgoing: function(message, callback) {
        log.trace({message: message}, 'faye server-side client outgoing message');
        message.ext = message.ext || {};
        message.ext.secret = APPSECRET;
        callback(message);
    }
});


/**
 * The Express application
 * --------------------------------------------------------------------
 */
var app = express();
app.disable('x-powered-by');


/**
 * Express middleware
 * --------------------------------------------------------------------
 */

// Security safeguards
app.use(function (req, res, next) {
    // Clickjacking - see
    // https://www.owasp.org/index.php/Clickjacking
    // --------------------------------------------------------------------
    res.setHeader('X-Frame-Options', 'DENY');

    // Content security policy - see
    // http://content-security-policy.com
    // --------------------------------------------------------------------

    // get hostname without port
    var hostname = req.headers['x-forwarded-host'] || req.headers.host;
    hostname = hostname.replace(/:[0-9]+$/, '', hostname);

    // account for custom websocket port
    var connectSrc = 'connect-src \'self\'';
    var scriptSrc = 'script-src \'self\'';


    if (nconf.get('NOTIFIER_WEBSOCKET_PORT')) {
        connectSrc += util.format(' %s://%s:%s', (nconf.get('NOTIFIER_FORCE_HTTPS') === 'true')? 'wss':'ws', hostname, nconf.get('NOTIFIER_WEBSOCKET_PORT'));
        scriptSrc  += util.format(' %s://%s:%s', (nconf.get('NOTIFIER_FORCE_HTTPS') === 'true')? 'https':'http', hostname, nconf.get('NOTIFIER_WEBSOCKET_PORT'));
    }

    if (nconf.get('NOTIFIER_LIVERELOAD')) {
        connectSrc += util.format(' %s://%s:%s', (nconf.get('NOTIFIER_FORCE_HTTPS') === 'true')? 'wss':'ws', nconf.get('NOTIFIER_DEV_HOST'), nconf.get('NOTIFIER_LIVERELOAD'));
        scriptSrc += util.format(' \'unsafe-inline\' http://%s:%s', nconf.get('NOTIFIER_DEV_HOST'), nconf.get('NOTIFIER_LIVERELOAD'));
    }

    var headerValue = [];
    headerValue.push('default-src \'self\'');
    headerValue.push('style-src \'self\'');
    headerValue.push('img-src \'self\' data:');
    headerValue.push(connectSrc);
    headerValue.push(scriptSrc);

    res.setHeader('Content-Security-Policy', headerValue.join('; '));
    next();
});

// Require HTTPS
if (nconf.get('NOTIFIER_FORCE_HTTPS') === 'true') {
    app.use(function (req, res, next) {
        // HTTP Strict Transport Security - see
        // https://www.owasp.org/index.php/HTTP_Strict_Transport_Security
        // --------------------------------------------------------------------
        res.setHeader('Strict-Transport-Security', util.format('max-age=%d', 60 * 60 * 24 * 30));

        if (req.headers['x-forwarded-proto'] === 'http') {
            res.redirect('https://' + req.headers['x-forwarded-host'] + req.url);
        } else {
            return next();
        }
    });
}

// Populate the X-Response-Time header
app.use(responseTime());

// Use compression
app.use(compression({
    threshold: 0
}));

// Request logging
app.use(function(req, res, next) {
    res.locals.requestId = +new Date();

    log.info({
        requestId: req._requestId,
        req: req
    }, 'start');

    res.on('finish', function () {
        log.info({
            requestId: res.locals.requestId,
            res: res
        }, 'end');
    });

    next();
});

// Parse urlencoded request bodies
app.use(bodyParser.urlencoded({
    extended: false,
    limit: '5kb'
}));

// Parse json request bodies
app.use(bodyParser.json({
    limit: '5kb'
}));

// Authentication
app.use(passport.initialize());


// Static fileserving
app.use(express.static(__dirname + '/public'));

/**
 * Parameter validation
 * --------------------------------------------------------------------
 */
app.param('count', function (req, res, next, value) {

    if (/\D/.test(value) === true) {
        var err = new Error('Invalid count');
        err.status = 400;
        next(err);
    } else {
        req.params.count = parseInt(value, 10);
        next();
    }
});


/**
 * Route helpers
 * --------------------------------------------------------------------
 */
var requireAuth = function (req, res, next) {
    var err = new Error('Invalid token');
    err.status = 401;

    var tokenValue = req.headers['x-token'];

    if (!tokenValue) {
        err = new Error('Unauthorized');
        err.status = 401;
        next(err);
        return;
    }

    var pattern = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
    if (pattern.test(tokenValue) === false) {
        next(err);
        return;
    }

    Token.find({
        include: [ User],
        where: { value: tokenValue }
    }).success(function (token) {
        if (!token) {
            next(err);
            return;
        }

        token.save([]).success(function () {
            req.token = tokenValue;
            req.user = token.user;
            next();
        });

    }).error(function () {
        err = new Error('Application error');
        err.status = 500;
        next(err);
        return;
    });
};

var publishMessage = function (user, message) {
    var channel = '/messages/' + user.getChannel();
    bayeuxClient.publish(channel, JSON.stringify(message));
};


/**
 * Routing
 * --------------------------------------------------------------------
 */

app.get(/^\/(login|logout)$/, function (req, res) {
    // For pushState compatibility, some URLs are treated as aliases of index.html
    res.sendFile(__dirname + '/public/index.html');
});

app.post('/deauth', requireAuth, function (req, res) {
    Token.destroy({
        value: req.token
    }).success(function () {
        res.status(200).end();
    }).error(function () {
        res.status(500).end();
    });
});

app.post('/auth', passport.authenticate('local', { session: false }), function (req, res) {
    var tokenLabel = req.body.label || '';
    tokenLabel = tokenLabel.replace(/[^a-zA-Z0-9-\.\/ ]/, '');
    if (tokenLabel === '') {
        tokenLabel =  useragent.parse(req.headers['user-agent']).toString();
    }

    var token = Token.build({
        label: tokenLabel
    });


    Token.prune(function () {
        token.save().success(function (token) {
            token.setUser(req.user).success(function () {
                res.json({
                    token: token.value,
                    channel: req.user.getChannel()
                });
            });
        }).error(function (error) {
            res.json(400, error);
        });
    });
});

app.post('/message', requireAuth, function (req, res, next) {
    var message;

    message = Message.build({
        received: new Date()
    });

    message.attributes.forEach(function (key) {
        if (key === 'id' || key === 'publicId') {
            return;
        }

        if (req.body.hasOwnProperty(key) && req.body[key]) {
            message[key] = req.body[key];
        }
    });

    if (message.isEmpty()) {
        var err = new Error('Message is blank');
        err.status = 400;
        next(err);
        return;
    }

    message.save().success(function () {
        message.setUser(req.user).success(function () {
            publishMessage(req.user, message);
            res.status(204).end();
        }).error(function (error) {
            var err = new Error(error);
            err.status = 400;
            next(err);
        });
    }).error(function (error) {
        var message = '';
        Object.keys(error).forEach(function (key) {
            message += key + ' ' + error[key].join('\\n') + ';';
        });

        var err = new Error(message);
        err.status = 400;
        next(err);
    });
});

app.get('/archive/:count', requireAuth, function (req, res) {
    var filters = {
        attributes: ['publicId', 'title', 'url', 'body', 'source', 'group', 'received'],
        limit: req.params.count,
        order: 'received DESC',
        UserId: req.user.id,
        where: {
            unread: true
        }
    };

    if (req.query.since) {
        req.query.since = parseInt(req.query.since, 10) || 0;
        if (req.query.since > 0) {
            filters.where.received = {
                gt: new Date(req.query.since)
            };
        }
    }

    Message.findAll(filters).success(function (messages) {
        messages = messages.map(function (message) {
            delete message.values.id;
            return message;
        });
        res.send(messages);
    });
});

app.post('/message/clear', requireAuth, function (req, res) {

    Message.update(
        {unread: false},
        {publicId: req.body.publicId}
    ).success(function () {
        publishMessage(req.user, {
            'cleared': req.body.publicId
        });
        res.status(204).end();
    });
});


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
    if (err) {
        res.status(err.status).send({message: err.message});
    } else {
        next();
    }
});


/**
 * Server startup
 * --------------------------------------------------------------------
 */
var sync = function (callback) {
    sequelize.sync().complete(function (err) {
        if (err) {
            log.fatal(err);
            process.exit();
        }

        createDefaultUser(function (err) {
            if (err) {
                log.fatal(err);
                process.exit();
            }
            callback();
        });
    });
};

if (!module.parent) {
    sync(function () {
        var server;
        if (nconf.get('NOTIFIER_SSL') !== '1') {
            server = app.listen(nconf.get('NOTIFIER_HTTP_PORT'), nconf.get('NOTIFIER_HTTP_IP'));
        } else {
            server = https.createServer({
                key: fs.readFileSync(nconf.get('NOTIFIER_SSL_KEY')),
                cert: fs.readFileSync(nconf.get('NOTIFIER_SSL_CERT'))
            }, app).listen(nconf.get('NOTIFIER_HTTP_PORT'), nconf.get('NOTIFIER_HTTP_IP'));
        }

        server.on('listening', function () {
            log.info({ip: nconf.get('NOTIFIER_HTTP_IP'), port: nconf.get('NOTIFIER_HTTP_PORT')}, 'appstart');

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
