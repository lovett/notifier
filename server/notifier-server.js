var bunyan = require('bunyan');
var https = require('https');
var fs = require('fs');
var faye = require('faye');
var deflate = require('permessage-deflate');
var express = require('express');
var bodyParser = require('body-parser');
var responseTime = require('response-time');
var Sequelize = require('sequelize');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var BasicStrategy = require('passport-http').BasicStrategy;
var crypto = require('crypto');
var compression = require('compression');
var util = require('util');
var url = require('url');
var useragent = require('useragent');
var nconf = require('nconf');
var sanitizeHtml = require('sanitize-html');
var path = require('path');
var needle = require('needle');

/**
 * Application configuration
 * --------------------------------------------------------------------
 *
 * Configuration settings are sourced from multiple
 * locations. Command-line arugments are checked first. If not defined
 * there, environment variables are considered. If no environment
 * variable exists, the configuration file is checked. As a last
 * resort, a limited set of default values are used.
 *
 * The * configuration file is env.json by default, but can be
 * overriden to env-{ENVIRONMENT NAME}.json by setting the NODE_ENV
 * environment variable.
 *
 */
nconf.argv();
nconf.env();

if (process.env.NODE_ENV) {
    nconf.file('env-' + process.env.NODE_ENV + '.json');
} else {
    nconf.file(path.resolve(__dirname + '/../env.json'));
}

nconf.defaults({
    'NOTIFIER_LOG': 'notifier.log',
    'NOTIFIER_LOG_LEVEL': 'warn',
    'NOTIFIER_PASSWORD_HASH_RANDBYTES': 64,
    'NOTIFIER_PASSWORD_HASH_KEYLENGTH': 64,
    'NOTIFIER_PASSWORD_HASH_ITERATIONS': 20000,
    'NOTIFIER_STATIC_DIR': path.resolve(__dirname + '/../static')
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
    serializers: bunyan.stdSerializers
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
 * Database configuration
 * --------------------------------------------------------------------
 *
 * NOTIFIER_DB_CONFIG can define multiple databases. The active
 * database is determined by the value of NOTIFIER_DB. It should
 * should correspond to one of the keys of NOTIFIER_DB_CONFIG.
 */
var getDbConfig = function () {
    var key, config;
    key = nconf.get('NOTIFIER_DB');

    if (nconf.get('NOTIFIER_DB_CONFIG') && nconf.get('NOTIFIER_DB_CONFIG').hasOwnProperty(key)) {
        config = nconf.get('NOTIFIER_DB_CONFIG')[key];
    } else {
        config = {
            sequelize: {}
        };
    }

    config.sequelize.logging = function (msg) {
        log.info({
            sequelize: msg
        }, 'query');
    };

    if (nconf.get('NOTIFIER_DB_USER')) {
        config.username = nconf.get('NOTIFIER_DB_USER');
    }

    if (nconf.get('NOTIFIER_DB_PASS')) {
        config.password = nconf.get('NOTIFIER_DB_PASS');
    }

    if (nconf.get('NOTIFIER_DB_NAME')) {
        config.dbname = nconf.get('NOTIFIER_DB_NAME');
    }

    return config;
};

var dbConfig = getDbConfig();

var sequelize = new Sequelize(dbConfig.dbname,
                              dbConfig.username,
                              dbConfig.password,
                              dbConfig.sequelize);

/**
 * HTML sanitizer configuration
 * --------------------------------------------------------------------
 */
var sanitizeStrictConfig = {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: function (text) {
        return text.replace(/&quot;/g, '"');
    },
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
    textFilter: function (text) {
        return text.replace(/&quot;/g, '"');
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

var Token = sequelize.define('Token', {
    key: {
        type: Sequelize.STRING(88),
        allowNull: false,
        validate: {
            len: {
                args: [1, 88],
                msg: 'should be between 1 and 88 characters'
            }
        }
    },
    value: {
        type: Sequelize.TEXT,
        allowNull: false,
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
    },
    persist: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
    }
}, {
    classMethods: {
        prune: function (callback) {
            Token.destroy({
                where: {
                    persist: false,
                    updatedAt: {
                        lt: new Date(new Date().getTime() - (60 * 60 * 24 * 7 * 1000))
                    }
                }
            }).then(function () {
                callback();
            });
        },

        generateKeyAndValue: function (callback) {
            var numBytes = 64;
            crypto.randomBytes(numBytes, function(err, buf) {
                var i, result, bag;

                if (err) {
                    log.error({err: err}, 'error while generating random bytes');
                    callback();
                }

                bag = 'abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789';

                result = '';
                for (i=0; i < numBytes; i = i + 1) {
                    result += bag[buf[i] % bag.length];
                }
                callback(result.substring(0, numBytes/2),
                         result.substring(numBytes/2));

            });
        }
    }
});

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
        type: Sequelize.STRING(258),
        allowNull: true,
        validate: {
            len: {
                args: [1, 258],
                msg: 'should be between 1 and 258 characters'
            }
        }
    }
}, {
    instanceMethods: {
        purgeServiceToken: function (service, callback) {
            if (!service) {
                callback(0);
            }

            Token.destroy({
                where: {
                    'UserId': this.id,
                    'label': 'service',
                    'key': service
                }
            }).then(function (affectedRows) {
                callback(affectedRows);
            });
        },
        getServiceTokens: function (callback) {
            var user = this;
            user.serviceTokens = {};

            Token.findAll({
                where: {
                    'UserId': user.id,
                    'label': 'service'
                },
                attributes: ['key', 'value']
            }).then(function (tokens) {
                tokens.forEach(function (token) {
                    user.serviceTokens[token.key] = token.value;
                });
                callback();
            });
        },

        getChannel: function () {
            var hmac = crypto.createHmac('sha256', APPSECRET);
            hmac.setEncoding('hex');
            hmac.write(this.id.toString());
            hmac.end();
            return hmac.read();
        },

        hashPassword: function (password, callback) {
            var self = this;
            var randBytes = nconf.get('NOTIFIER_PASSWORD_HASH_RANDBYTES');
            var keyLength = nconf.get('NOTIFIER_PASSWORD_HASH_KEYLENGTH');
            var iterations = nconf.get('NOTIFIER_PASSWORD_HASH_ITERATIONS');

            crypto.randomBytes(randBytes, function(err, buf) {
                var salt;
                if (err) {
                    log.error({err: err}, 'error while generating random bytes');
                }

                salt = buf.toString('hex');

                crypto.pbkdf2(password, salt, iterations, keyLength, function (err, key) {
                    self.setDataValue('passwordHash', util.format('%s::%s', salt, key.toString('hex')));
                    callback();
                });
            });
        },

        checkPassword: function (password, callback) {
            var segments = this.getDataValue('passwordHash').split('::');
            var keyLength = nconf.get('NOTIFIER_PASSWORD_HASH_KEYLENGTH');
            var iterations = nconf.get('NOTIFIER_PASSWORD_HASH_ITERATIONS');

            crypto.pbkdf2(password, segments[0], iterations, keyLength, function (err, key) {
                callback(key.toString('hex') === segments[1]);
            });
        },
    }
});


var Message = sequelize.define('Message', {
    publicId: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false
    },
    localId: {
        type: Sequelize.STRING(255),
        allowNull: true,
        set: function (value) {
            return sanitizeStrict(this, 'localId', value);
        }
    },
    pushbulletId: {
        type: Sequelize.STRING(255),
        allowNull: true
    },
    title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        validate: {
            len: {
                args: [1,255],
                msg: 'should be 1-255 characters long'
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
                args: [1,255],
                msg: 'should be 1-255 characters long'
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
                msg: 'should be 1-500 characters long'
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
                msg: 'should be 1-20 characters long'
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
                msg: 'should be 1-20 characters long'
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
var createUser = function (username, password, callback) {
    User.findOrCreate({ where: {username: username}}).spread(function (user, created) {
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
 * Authentication configuration
 * --------------------------------------------------------------------
 */
passport.use(new LocalStrategy(function (username, password, done) {
    User.find({ where: { username: username } }).then(function (user) {

        if (!user) {
            return done(null, false);
        }

        user.checkPassword(password, function (valid) {
            if (valid) {
                return done(null, user);
            } else {
                return done(null, false);
            }
        });
    }, function (error) {
        return done(error);
    });
}));


passport.use(new BasicStrategy(function(key, value, next) {
    var err;
    Token.find({
        include: [ User],
        where: {
            value: value
        }
    }).then(function (token) {
        err = new Error('Invalid token');
        err.status = 401;

        if (!token) {
            next(err);
            return;
        }

        if (token.key !== key) {
            next(err);
            return;
        }

        token.User.token = {
            key: key,
            value: value
        };

        next(null, token.User);

    }).catch(function () {
        err = new Error('Application error');
        err.status = 500;
        next(err);
        return;
    });
}));

/**
 * Websocket setup
 * --------------------------------------------------------------------
 */
var bayeux = new faye.NodeAdapter({
    mount: '/messages'
});

bayeux.addWebsocketExtension(deflate);

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
    }).then(function (token) {
        var tokenAge;

        if (!token || !token.User) {
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

        if (channelSegments[1] !== token.User.getChannel()) {
            log.info({channel: message.subscription}, 'stale channel');
            message.error = '301::' + token.User.getChannel();
            callback(message);
            return;
        }

        // Advance the token updatedAt value if older than 1 hour
        tokenAge = new Date() - new Date(token.updatedAt);
        if (tokenAge > (60 * 60 * 1000)) {
            token.save().then(function () {
                callback(message);
            });
        } else {
            callback(message);
        }

    }, function () {
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
        // the localId is not sent to clients
        delete message.localId;

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

// Static file request prechecking
app.use(function (req, res, next) {
    var err;

    // Disallow querystrings on view templates
    if (req.path.indexOf('views') === -1) {
        return next();
    }

    if (Object.keys(req.query).length !== 0) {
        err = new Error('Invalid request');
        err.status = 400;
        return next(err);
    }

    if (req.method !== 'GET') {
        err = new Error('Not allowed');
        err.status = 405;
        return next(err);
    }

    next();
});

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

    var httpProtocol = (nconf.get('NOTIFIER_FORCE_HTTPS') === 'true')? 'https':'http';
    var websocketProtocol = (nconf.get('NOTIFIER_FORCE_HTTPS') === 'true')? 'wss':'ws';

    if (nconf.get('NOTIFIER_WEBSOCKET_PORT')) {
        connectSrc += util.format(' %s://%s:%s', websocketProtocol, hostname, nconf.get('NOTIFIER_WEBSOCKET_PORT'));
        scriptSrc  += util.format(' %s://%s:%s', httpProtocol, hostname, nconf.get('NOTIFIER_WEBSOCKET_PORT'));
    }

    if (nconf.get('NOTIFIER_LIVERELOAD_HOST') && nconf.get('NOTIFIER_LIVERELOAD_PORT')) {
        var liveReloadHostPort = util.format('%s:%s', nconf.get('NOTIFIER_LIVERELOAD_HOST'), nconf.get('NOTIFIER_LIVERELOAD_PORT'));
        connectSrc += util.format(' %s://%s', websocketProtocol, liveReloadHostPort);
        scriptSrc += util.format(' %s://%s', httpProtocol, liveReloadHostPort);
    }

    var headerValue = [];
    headerValue.push('default-src \'self\'');
    headerValue.push('style-src \'self\' \'unsafe-inline\'');
    headerValue.push('img-src \'self\' data:');
    headerValue.push(connectSrc);
    headerValue.push(scriptSrc);

    res.setHeader('Content-Security-Policy', headerValue.join('; '));

    // Flash cross domain policy file - see
    // http://www.adobe.com/devnet-docs/acrobatetk/tools/AppSec/CrossDomain_PolicyFile_Specification.pdf
    // --------------------------------------------------------------------
    if (req.path === '/crossdomain.xml') {
        res.set('Content-Type', 'text/x-cross-domain-policy');
    }

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
        requestId: res.locals.requestId,
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
app.use(express.static(nconf.get('NOTIFIER_STATIC_DIR')));

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
var publishMessage = function (user, message) {
    var channel = '/messages/' + user.getChannel();
    bayeuxClient.publish(channel, JSON.stringify(message));

    user.getServiceTokens(function () {
        if (!user.serviceTokens.hasOwnProperty('pushbullet')) {
            return;
        }

        if (message.pushbulletId === '0') {
            return;
        }

        if (message.hasOwnProperty('retracted')) {
            Message.find({
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
            needle.post('https://api.pushbullet.com/v2/pushes', {
                'title': message.title,
                'body': message.body,
                'type': 'note'
            }, {
                'username': user.serviceTokens.pushbullet,
                'password': ''
            }, function (err, res) {
                if (res.body.error) {
                    log.error({err: res.body.error}, 'pushbullet error');
                    return;
                }

                Message.update(
                    {pushbulletId: res.body.iden},
                    {where: {id: message.id}}
                );
            });
        }
    });
};


/**
 * Routing
 * --------------------------------------------------------------------
 */
app.get('/', function (req, res) {
    res.sendFile(nconf.get('NOTIFIER_STATIC_DIR') + '/views/index.html');
});

app.get(/^\/(login|logout|onedrive)$/, function (req, res) {
    // For pushState compatibility, some URLs are treated as aliases of the index view
    res.sendFile(nconf.get('NOTIFIER_STATIC_DIR') + '/views/index.html');
});

app.post('/deauth', passport.authenticate('basic', { session: false }), function (req, res) {

    Token.destroy({
        where: {
            value: req.user.token.value
        }
    }).then(function () {
        res.sendStatus(200);
    }).catch(function () {
        res.sendStatus(500);
    });
});

app.get('/services', passport.authenticate('basic', { session: false}), function (req, res) {
    req.user.getServiceTokens(function () {
        var tokens = Object.keys(req.user.serviceTokens);
        res.json(tokens);
    });
});

app.post('/revoke', passport.authenticate('basic', {session: false}), function (req, res) {
    req.user.purgeServiceToken(req.body.service, function (numDeletions) {
        if (numDeletions === 0) {
            res.sendStatus(500);
        } else {
            res.sendStatus(200);
        }
    });
});

app.get('/authorize/onedrive/start', passport.authenticate('basic', {session: false}), function (req, res) {
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

app.get('/authorize/onedrive/finish', function (req, res) {
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
                res.redirect('/');
            }
        });

    });
});


app.get('/authorize/pushbullet/start', passport.authenticate('basic', {session: false}), function (req, res) {

    function sendUrl (tokenValue) {
        var redirectUri = url.format({
            protocol: req.query.protocol,
            host: req.query.host,
            pathname: '/authorize/pushbullet/finish',
            query: {
                token: tokenValue
            }
        });

        res.json({
            url: url.format({
                protocol: 'https',
                slashes: true,
                host: 'www.pushbullet.com',
                pathname: '/authorize',
                query: {
                    'client_id': nconf.get('NOTIFIER_PUSHBULLET_CLIENT_ID'),
                    'response_type': 'code',
                    'redirect_uri': redirectUri
                }
            })
        });
    }

    var token = Token.build({
        key: 'pushbullet',
        label: 'service'
    });

    Token.generateKeyAndValue(function (key, value) {
        token.value = value;
        token.save().then(function (token) {
            token.setUser(req.user).then(function () {
                sendUrl(token.value);
            });
        }, function (error) {
            res.status(400).json(error);
        });
    });

});

app.get('/authorize/pushbullet/finish', function (req, res) {
    var tokenUrl = url.format({
        protocol: 'https',
        slashes: true,
        host: 'api.pushbullet.com',
        pathname: '/oauth2/token'
    });

    Token.find({
        include: [ User],
        where: {
            value: req.query.token
        }
    }).then(function (token) {
        if (!token.User) {
            log.error({}, 'user not found during pushbullet auth callback');
            res.redirect('/');
            return;
        }

        if (!req.query.code) {
            Token.destroy({
                where: {
                    key: 'pushbullet',
                    UserId: token.User.id
                }
            }).then(function () {
                res.redirect('/');
            });
            return;
        }

        needle.post(tokenUrl, {
            'grant_type': 'authorization_code',
            'client_id': nconf.get('NOTIFIER_PUSHBULLET_CLIENT_ID'),
            'client_secret': nconf.get('NOTIFIER_PUSHBULLET_CLIENT_SECRET'),
            'code': req.query.code
        }, function (err, resp, body) {
            Token.destroy({
                where: {
                    key: 'pushbullet',
                    UserId: token.User.id,
                    id: {
                        $ne: token.id
                    }
                }
            }).then(function () {
                /*jshint camelcase: false */
                token.updateAttributes({
                    value: body.access_token,
                    persist: true
                }).then(function () {
                    res.redirect('/');
                });
            });
        });
    }, function () {
        res.sendStatus(400);
    });
});

app.post('/auth', passport.authenticate('local', { session: false }), function (req, res) {
    var tokenLabel = req.body.label || '';
    tokenLabel = tokenLabel.replace(/[^a-zA-Z0-9-\.\/ ]/, '');
    if (tokenLabel === '') {
        tokenLabel =  useragent.parse(req.headers['user-agent']).toString();
    }

    var tokenPersist = req.body.persist || false;

    var token = Token.build({
        label: tokenLabel,
        persist: tokenPersist
    });


    Token.generateKeyAndValue(function (key, value) {
        token.key = key;
        token.value = value;

        Token.prune(function () {
            token.save().then(function (token) {
                token.setUser(req.user).then(function () {
                    res.json({
                        key: token.key,
                        value: token.value,
                        channel: req.user.getChannel()
                    });
                });
            }, function (error) {
                res.status(400).json(error);
            });
        });
    });

});

app.post('/message', passport.authenticate('basic', { session: false }), function (req, res, next) {
    var message;

    if (Object.keys(req.body).length === 0) {
        var err = new Error('Message is blank');
        err.status = 400;
        next(err);
        return;
    }

    message = Message.build({
        received: new Date()
    });

    message.attributes.forEach(function (key) {
        if (key === 'id' || key === 'publicId') {
            return;
        }

        if (req.body.hasOwnProperty(key) && req.body[key]) {
            message[key] = req.body[key].trim();
        }
    });

    message.save().then(function () {
        message.setUser(req.user).then(function () {
            publishMessage(req.user, message);
            res.sendStatus(204);
        });
    }).catch(function (error) {
        var message = '';
        error.errors.forEach(function (err) {
            message += err.message + ';';
        });

        var err = new Error(message);
        err.status = 400;
        next(err);
    });
});

app.get('/archive/:count', passport.authenticate('basic', { session: false }), function (req, res) {
    var filters = {
        attributes: ['publicId', 'title', 'url', 'body', 'source', 'group', 'received'],
        limit: req.params.count,
        order: 'received DESC',
        where: {
            UserId: req.user.id,
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

    Message.findAll(filters).then(function (messages) {
        messages = messages.map(function (message) {
            delete message.id;
            return message;
        });
        res.send(messages);
    });
});

app.post('/message/clear', passport.authenticate('basic', { session: false }), function (req, res) {

    var update = function (id) {
        Message.update(
            {unread: false},
            {where: {publicId: id}}
        ).then(function (affectedRows) {
            if (affectedRows[0] === 0) {
                res.sendStatus(400);
                return;
            }

            publishMessage(req.user, {
                'retracted': id
            });
            res.sendStatus(204);
        }).catch(function () {
            res.sendStatus(500);
        });
    };

    if (req.body.hasOwnProperty('publicId')) {
        update(req.body.publicId);
    } else if (req.body.hasOwnProperty('localId')) {
        Message.find({
            where: {
                localId: req.body.localId,
                unread: true
            },
            limit: 1
        }).then(function (message) {
            if (!message) {
                res.sendStatus(400);
            } else {
                update(message.publicId);
            }

        });
    } else {
        res.sendStatus(400);
    }

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
var sync = function (callback) {
    sequelize.sync().complete(function (err) {
        if (err) {
            log.fatal(err);
            process.exit();
        }

        if (nconf.get('NOTIFIER_DEFAULT_USER')) {
            var user, password;
            user = nconf.get('NOTIFIER_DEFAULT_USER').toLowerCase();
            password = nconf.get('NOTIFIER_DEFAULT_PASSWORD');

            createUser(user, password, function (err) {
                if (err) {
                    log.fatal(err);
                    process.exit();
                }
                callback();
            });
        }
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
exports.createUser = createUser;
exports.getDbConfig = getDbConfig;
exports.nconf = nconf;
