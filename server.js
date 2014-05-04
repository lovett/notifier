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
var subscriptions = {
    browser: [],
    speech: []
};

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
});

var Message = sequelize.define('Message', {
    title: { type: Sequelize.STRING, allowNull: false},
    url: { type: Sequelize.STRING, allowNull: true},
    body: { type: Sequelize.STRING, allowNull: true},
    source: { type: Sequelize.STRING, allowNull: true},
    group: { type: Sequelize.STRING, allowNull: true, defaultValue: 'default'},
    event: { type: Sequelize.STRING, allowNull: true},
}, { timestamps: true, updatedAt: false, createdAt: 'received' });

sequelize.sync();

CONFIG.users.forEach(function (element) {
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
            return done(null, false, { message: 'Invalid login' });
        }

        if (!bcrypt.compareSync(password, user.values.passwordHash)) {
            return done(null, false, { message: 'Invalid login' });
        }

        return done(null, user);
    }).error(function (error) {
        return done(error);
    });
}));

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

var requireAuth = function (req, res, next) {
    var cookies = new Cookies(req, res);

    var tokenValue = cookies.get('u');

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

app.post('/auth', passport.authenticate('local', { session: false }), function (req, res) {
    var token = Token.build({
        userId: req.user.values.id
    });
    
    token.save().success(function (token) {
        var cookies = new Cookies(req, res);
        // expire in 1 year
        cookies.set('u', token.value, {httpOnly: false, maxage: (365 * 24 * 60 * 60 * 1000)});
        res.send(200);
    });
});

// Static fileserving
app.use(express.static(__dirname + '/public'));

// Endpoint for receiving messages
app.post('/message', function (req, res) {

    var message = Message.build();
    var channel;

    req.body.noarchive = req.body.noarchive || 0;

    message.attributes.forEach(function (key) {
        if (key === 'id') {
            return;
        }
        
        if (req.body.hasOwnProperty(key)) {
            message.values[key] = req.body[key];
        }
    });

    if (message.values === undefined) {
        res.send(404, 'Message is empty');
        return;
    }

    message.received = +new Date();

    if (subscriptions.browser.length > 0) {
        channel = 'browser';
    } else if (subscriptions.speech.length > 0) {
        channel = 'speech';
    }
        
    bayeuxClient.publish('/messages/browser/' + message.group, JSON.stringify(message));

    if (req.body.noarchive === 1) {
        res.send(204);
    } else {
        message.save().success(function () {
            res.send(204);
        });
    }
});

// Endpoint for archived messages
app.get('/archive/:count', requireAuth, function (req, res) {
    Message.findAll({
        limit: req.params.count,
        order: 'received DESC'
    }).success(function (messages) {
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
    var segments = channel.split('/');

    if (segments[1] !== 'messages') {
        return;
    }

    if (Object.keys(subscriptions).indexOf(segments[2]) === -1) {
        return;
    }

    subscriptions[segments[2]].push(clientId);
});

bayeux.on('disconnect', function (clientId) {
    var keys, index;

    keys = Object.keys(subscriptions);

    keys.forEach(function (key) {
        index = subscriptions[key].indexOf(clientId);
        if (index > -1) {
            subscriptions[key].splice(index, 1);
        }
    });
});

console.log('Listening on port ' + CONFIG.http.port);

