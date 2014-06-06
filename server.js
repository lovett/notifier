var bunyan = require('bunyan');
var https = require('https');
var fs = require('fs');
var faye = require('faye');
var express = require('express');
var bodyParser = require('body-parser');
var responseTime = require('response-time');
var app = express();
var Sequelize = require('sequelize');
var bcrypt = require('bcrypt');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var crypto = require('crypto');
var compress = require('compression');
var util = require('util');

/**
 * Environment variables
 * --------------------------------------------------------------------
 *
 * If the file env.json exists, declare its contents as environtment
 * variables.
 */
var env;
try {
    env = fs.readFileSync('env.json', {encoding: 'utf8'});
    env = JSON.parse(env);
} catch (e) {
    env = {};
}

Object.keys(env).forEach(function (key) {
    process.env[key] = env[key];
});

env = {};
 

/**
 * Logging configuration
 * --------------------------------------------------------------------
 */
var log = bunyan.createLogger({
    name: 'notifier',
    streams: [
        {
            path: process.env.NOTIFIER_LOG || 'notifier.log',
            level: 'trace'
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
var sequelize = new Sequelize('', '', '', {
    dialect: process.env.NOTIFIER_DB_DRIVER,
    storage: process.env.NOTIFIER_SQLITE_PATH,
    logging: function (msg) {
        log.info({
            sequelize: msg
        }, 'query');
    }
});


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
                msg: 'Should be between 1 and 20 characters'
            }
        }
    },
    passwordHash: {
        type: Sequelize.STRING(60),
        allowNull: true,
        validate: {
            len: {
                args: [1, 60],
                msg: 'Should be between 1 and 60 characters'
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
        type: Sequelize.STRING(20),
        allowNull: true,
        validate: {
            len: {
                args: [1, 20],
                msg: 'Should be between 1 and 20 characters'
            }
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
        defaultValue: 'untitled',
        validate: {
            len: {
                args: [1, 50],
                msg: 'Should be between 1 and 50 characters'
            }
        }
    },
    url: {
        type: Sequelize.STRING(255),
        allowNull: true,
        validate: {
            len: {
                args: [1, 255],
                msg: 'Should be between 1 and 255 characters'
            }
        }
    },
    body: {
        type: Sequelize.STRING(500),
        allowNull: true,
        validate: {
            len: {
                args: [1,500],
                msg: 'Should be between 1 and 500 characters'
            }
        }
    },
    source: {
        type: Sequelize.STRING(20),
        allowNull: true,
        validate: {
            len: {
                args: [1,20],
                msg: 'Should be between 1 and 20 characters'
            }
        }
    },
    group: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'default',
        validate: {
            len: {
                args: [1,20],
                msg: 'Should be between 1 and 20 characters'
            }
        }
    },
    event: {
        type: Sequelize.STRING(20),
        allowNull: true,
        validate: {
            len: {
                args: [1,20],
                msg: 'Should be between 1 and 20 characters'
            }
        }
    },
}, { timestamps: true, updatedAt: false, createdAt: 'received' });

/**
 * ORM associations
 * --------------------------------------------------------------------
 */
User.hasMany(Token);
Token.belongsTo(User);

User.hasMany(Message);
Message.belongsTo(User);


/**
 * ORM initialization
 * --------------------------------------------------------------------
 */
sequelize.sync();

// Create the default user
if (process.env.NOTIFIER_DEFAULT_USER) {
    User.findOrCreate({ username: process.env.NOTIFIER_DEFAULT_USER.toLowerCase()}).success(function (user, created) {
        if (created === true) {
            var salt = bcrypt.genSaltSync(10);
            user.values.passwordHash = bcrypt.hashSync(process.env.NOTIFIER_DEFAULT_PASSWORD, salt);
            user.save();
        }
    });
}


/**
 * Authentication configuration
 * --------------------------------------------------------------------
 */
passport.use(new LocalStrategy(function (username, password, done) {
    if (username === false || password === false) {
        return done();
    }

    // username is case insensitive
    // password is case sensitive
    username = username.toLowerCase();

    User.find({ where: { username: username } }).success(function (user) {
        if (!user) {
            return done(null, false);
        }

        if (!bcrypt.compareSync(password, user.values.passwordHash)) {
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
    timeout: 30
});


/**
 * Websocket helpers
 * --------------------------------------------------------------------
 */
var verifySubscription = function (message, callback) {
    log.info({message: message}, 'verifying subscription request');

    if (!message.ext.authToken) {
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
        if (message.subscription.replace('/messages/', '') !== token.user.getChannel()) {
            log.info({channel: message.subscription}, 'stale channel');
            message.error = '301::' + token.user.getChannel();
            callback(message);
            return;
        }

        // Looks good
        log.info('subscription looks good');
        callback(message);
        
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
    incoming: function(message, callback) {
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
        } else {
            log.info({message: message}, 'legit message');
        }
        
        // The application secret should never be revealed
        delete message.ext.secret;
        
        return callback(message);
    }
});


/**
 * Websocket event handlers
 * --------------------------------------------------------------------
 */
bayeux.on('subscribe', function (clientId, channel) {
    channel = channel.replace(/\/+/, '/');
    channel = channel.replace(/^\//, '');

    var segments = channel.split('/');
    var channelRoot = segments[0];

    if (channelRoot !== 'messages') {
        return;
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
        message.ext = message.ext || {};
        message.ext.secret = APPSECRET;
        callback(message);
    }
});


/**
 * Customize Express server headers
 * --------------------------------------------------------------------
 */
app.disable('x-powered-by');


/**
 * Express middleware
 * --------------------------------------------------------------------
 */

// Enable live reload (for dev environment)
if (process.env.NOTIFIER_LIVERELOAD) {
    app.use(require('connect-livereload')({
        port: process.env.NOTIFIER_LIVERELOAD
    }));
}

// Security safeguards
app.use(function (req, res, next) {
    // Clickjacking - see https://www.owasp.org/index.php/Clickjacking
    // --------------------------------------------------------------------
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Content security policy - see http://content-security-policy.com
    // --------------------------------------------------------------------

    // get hostname without port
    var hostname = req.headers['x-forwarded-host'] || req.headers.host;
    hostname = hostname.replace(/:[0-9]+$/, '', hostname);  

    // account for custom websocket port
    var connectSrc = 'connect-src \'self\'';
    var scriptSrc = 'script-src \'self\'';


    if (process.env.NOTIFIER_WEBSOCKET_PORT) {
        connectSrc += util.format(' ws://%s:%s', hostname, process.env.NOTIFIER_WEBSOCKET_PORT);
    }

    if (process.env.NOTIFIER_LIVERELOAD) {
        connectSrc += util.format(' ws://%s:%s', hostname, process.env.NOTIFIER_LIVERELOAD);
        scriptSrc += util.format(' \'unsafe-inline\' http://%s:%s', hostname, process.env.NOTIFIER_LIVERELOAD);
    }

    var headerValue = [];
    headerValue.push('default-src \'self\'');
    headerValue.push('style-src \'self\' fonts.googleapis.com');
    headerValue.push('font-src themes.googleusercontent.com');
    headerValue.push(connectSrc);
    headerValue.push(scriptSrc);

    res.setHeader('Content-Security-Policy', headerValue.join('; '));
    next();
});

// Require HTTPS
if (process.env.NOTIFIER_FORCE_HTTPS) {
    app.use(function (req, res, next) {
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
app.use(compress());

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

// Refuse large request bodies
app.use(bodyParser({
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
app.param('u', function(req, res, next, value) {
    var pattern = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
    if (!pattern.test(value)) {
        delete req.params.u;
    }
    next();
});

app.param('count', function (req, res, next, value) {
    req.params.count = parseInt(value, 10) || 0;
    next();
});


/**
 * Route helpers
 * --------------------------------------------------------------------
 */
var requireAuth = function (req, res, next) {
    var tokenValue = req.headers['x-token'] || req.body.u || req.params.u;

    if (!tokenValue) {
        var err = new Error('Unauthorized');
        err.status = 401;
        next(err);
        return;
    }

    Token.find({
        include: [ User],
        where: { value: tokenValue }
    }).success(function (token) {
        if (!token) {
            var err = new Error('Unauthorized');
            err.status = 401;
            next(err);
            return;
        }

        req.user = token.user;
        next();

    }).error(function () {
        var err = new Error('Application error');
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
    res.sendfile(__dirname + '/public/index.html');
});

app.post('/auth', passport.authenticate('local', { session: false }), function (req, res) {
    var tokenLabel = req.body.label || '';
    tokenLabel = tokenLabel.replace(/[^a-zA-Z0-9-\.]/, '');
    if (tokenLabel === '') {
        tokenLabel = null;
    }

    var token = Token.build({
        label: tokenLabel
    });

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

app.post('/message', requireAuth, function (req, res, next) {
    var message;

    message = Message.build({
        received: new Date()
    });

    message.attributes.forEach(function (key) {
        if (key === 'id' || key === 'publicId') {
            return;
        }

        if (req.body.hasOwnProperty(key)) {
            message.values[key] = req.body[key];
        }
    });

    message.save().success(function () {
        message.setUser(req.user).success(function () {
            publishMessage(req.user, message);
            res.send(204);
            next();
        }).error(function (error) {
            var err = new Error(error);
            err.status = 400;
            next(err);
            next();
        });
    }).error(function (error) {
        var err = new Error(error);
        err.status = 400;
        next(err);
        next();
    });
});

app.get('/archive/:count/:u?', requireAuth, function (req, res) {
    var filters = {
        limit: req.params.count,
        order: 'received DESC',
        UserId: req.user.id,
        where: {}
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
        res.send(messages);
    });
});


/**
 * Error handling
 * --------------------------------------------------------------------
 *
 * This should come after all other routes and middleware
 */
app.use(function(err, req, res, next) {
    res.send(err.status);
    next();
});


/**
 * Server startup
 * --------------------------------------------------------------------
 */
if (process.env.NOTIFIER_SSL !== '1') {
    var server = app.listen(process.env.NOTIFIER_HTTP_PORT, process.env.NOTIFIER_HTTP_IP);
} else {
    var server = https.createServer({
        key: fs.readFileSync(process.env.NOTIFIER_SSL_KEY),
        cert: fs.readFileSync(process.env.NOTIFIER_SSL_CERT)
    }, app).listen(process.env.NOTIFIER_HTTP_PORT, process.env.NOTIFIER_HTTP_IP);
}

// Attach to the express server returned by listen, rather than app itself.
// See https://github.com/faye/faye/issues/256
bayeux.attach(server);

log.info({ip: process.env.NOTIFIER_HTTP_IP, port: process.env.NOTIFIER_HTTP_PORT}, 'appstart');
