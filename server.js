var CONFIG = require('config');
var https = require('https');
var fs = require('fs');
var faye = require('faye');
var express = require('express');
var bodyParser = require('body-parser');
var Cookies = require('cookies');
var app = express();
var Sequelize = require('sequelize');
var bcrypt = require('bcrypt');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var subscribers = {
    browser: [],
    speech: []
};

if (CONFIG.livereload) {
    app.use(require('connect-livereload')({
        port: CONFIG.livereload
    }));
}

var sequelize = new Sequelize('', '', '', {
    dialect: 'sqlite',
    storage: './dev.sqlite'
});

var User = sequelize.define('User', {
    username: { type: Sequelize.STRING, unique: true, allowNull: false},
    passwordHash: { type: Sequelize.STRING, allowNull: true}
});

var Token = sequelize.define('Token', {
    userId: { type: Sequelize.INTEGER, allowNull: false},
    value: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false},
    label: { type: Sequelize.STRING, allowNull: true}
});

var Message = sequelize.define('Message', {
    publicId: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, allowNull: false},
    userId: { type: Sequelize.INTEGER, allowNull: false},
    title: { type: Sequelize.STRING, allowNull: false, defaultValue: 'untitled'},
    url: { type: Sequelize.STRING, allowNull: true},
    body: { type: Sequelize.STRING, allowNull: true},
    source: { type: Sequelize.STRING, allowNull: true},
    group: { type: Sequelize.STRING, allowNull: true, defaultValue: 'default'},
    event: { type: Sequelize.STRING, allowNull: true},
}, { timestamps: true, updatedAt: false, createdAt: 'received' });

sequelize.sync();

CONFIG.defaultUsers.forEach(function (element) {
    User.findOrCreate({ username: element.username}).success(function (user, created) {
        if (created === true) {
            var salt = bcrypt.genSaltSync(10);
            user.values.passwordHash = bcrypt.hashSync(element.password, salt);
            user.save();
        }
    });
});

passport.use(new LocalStrategy(function (username, password, done) {
    if (username === false || password === false) {
        return done();
    }

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

app.use(passport.initialize());

// Websocket endpoint for browser clients
var bayeux = new faye.NodeAdapter({
    mount: '/faye',
    timeout: 30
});

var bayeuxClient = bayeux.getClient();

//app.use(express.compress());

// Express should only accept regular, urlencoded requests.
// No json, no file uploads.
app.use(bodyParser());

app.use(Cookies.express());

app.use(function(req, res, next){
    console.log('%s %s', req.method, req.url);
    next();
});

app.get('/login', function (req, res) {
    res.sendfile(__dirname + '/public/index.html');
});

app.get('/logout', function (req, res) {
    res.sendfile(__dirname + '/public/index.html');
});

var requireAuth = function (req, res, next) {
    var cookies = new Cookies(req, res);

    var tokenValue = cookies.get('u') || req.body.u || req.params.u;

    if (!tokenValue) {
        res.send(401);
        return;
    }

    Token.find({
        where: { value: tokenValue },
        attributes: ['userId']
    }).success(function (token) {
        if (!token) {
            res.send(401);
            return;
        }
        req.userId = token.values.userId;
        next();
    }).error(function () {
        res.send(500);
        return;
    });
};

var publishMessage = function (message) {
    var channel, primaryGroup;

    primaryGroup = message.values.group.split('.').pop();

    if (subscribers.browser.length > 0) {
        channel = 'browser';
    } else if (subscribers.speech.length > 0) {
        channel = 'speech';
    }

    delete message.values.id;

    bayeuxClient.publish('/messages/' + channel + '/' + primaryGroup, JSON.stringify(message));
};

app.post('/auth', passport.authenticate('local', { session: false }), function (req, res) {
    var tokenLabel = req.body.label || '';
    tokenLabel = tokenLabel.replace(/[^a-zA-Z0-9-\.]/, '');
    if (tokenLabel === '') {
        tokenLabel = null;
    }

    var token = Token.build({
        userId: req.user.values.id,
        label: tokenLabel
    });

    token.save().success(function (token) {
        res.json({token: token.value});
    });
});

// Static fileserving
app.use(express.static(__dirname + '/public'));

// Endpoint for receiving messages
app.post('/message', requireAuth, function (req, res) {
    var message;

    message = Message.build({
        received: new Date(),
        userId: req.userId
    });

    message.attributes.forEach(function (key) {
        if (key === 'id' || key === 'publicId' || key === 'userId') {
            return;
        }

        if (req.body.hasOwnProperty(key)) {
            message.values[key] = req.body[key];
        }
    });

    publishMessage(message);

    message.save().success(function () {
        res.send(204);
    });
});

// Endpoint for archived messages
app.get('/archive/:count/:u?', requireAuth, function (req, res) {
    var filters = {
        limit: req.params.count,
        order: 'received DESC',
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


if (CONFIG.ssl.enabled !== 1) {
    // non-SSL
    var server = app.listen(CONFIG.http.port);
} else {
    // SSL
    var server = https.createServer({
        key: fs.readFileSync(CONFIG.ssl.key),
        cert: fs.readFileSync(CONFIG.ssl.cert)
    }, app).listen(CONFIG.http.port);
}


// Attach to the express server returned by listen, rather than app itself.
// See https://github.com/faye/faye/issues/256
bayeux.attach(server);

bayeux.on('subscribe', function (clientId, channel) {
    channel = channel.replace(/\/+/, '/');
    channel = channel.replace(/^\//, '');

    var segments = channel.split('/');
    var channelRoot = segments[0];
    var subscriberType = segments[1];

    if (channelRoot !== 'messages') {
        return;
    }

    if (Object.keys(subscribers).indexOf(subscriberType) === -1) {
        return;
    }

    subscribers[subscriberType].push(clientId);
});

bayeux.on('disconnect', function (clientId) {
    var keys, index;

    keys = Object.keys(subscribers);

    keys.forEach(function (key) {
        index = subscribers[key].indexOf(clientId);
        if (index > -1) {
            subscribers[key].splice(index, 1);
        }
    });
});

console.log('Listening on port ' + CONFIG.http.port);
