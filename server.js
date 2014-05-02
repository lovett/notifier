var CONFIG = require('config');
var https = require('https');
var fs = require('fs');
var faye = require('faye');
var express = require('express');
var bodyParser = require('body-parser');
var Cookies = require('cookies');
var app = express();
var redisClient = require('redis').createClient();
var uuid = require('node-uuid');
var subscriptions = {
    browser: [],
    speech: []
};

redisClient.select(CONFIG.redis.dbnum);

// Websocket endpoint for browser clients
var bayeux = new faye.NodeAdapter({
    mount: '/faye',
    timeout: 30
});

var bayeuxClient = bayeux.getClient();


var testLogin = function (username, password) {
    if (username === false || password === false) {
        return false;
    }
    
    if (!CONFIG.users.hasOwnProperty(username)) {
        return false;
    }
    
    if (CONFIG.users[username] !== password) {
        return false;
    }
    
    return true;
    
};


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

app.post('/auth', function (req, res) {
    var result = testLogin(req.body.username, req.body.password);
    if (result === true) {
        var id = uuid.v4();
        redisClient.set('token.' + id, +new Date());

        var cookies = new Cookies(req, res);

        // expire in 1 year
        cookies.set('u', id, {httpOnly: false, maxage: (365 * 24 * 60 * 60 * 1000)});
        res.send(200);
    } else {
        res.send(401);
    }
});

// Static fileserving
app.use(express.static(__dirname + '/public'));

// Endpoint for receiving messages
app.post('/message', function (req, res) {
    var message = {};
    var keys = ['title', 'url', 'body', 'source', 'group', 'noarchive', 'event'];
    var jsonString;

    keys.forEach(function (key) {
        if (req.body.hasOwnProperty(key)) {
            message[key] = req.body[key];
        }
    });

    if (Object.keys(message).length === 0) {
        res.send(404, 'Message is empty');
    }

    message.received = +new Date();

    jsonString = JSON.stringify(message);

    if (subscriptions.browser.length > 0) {
        bayeuxClient.publish('/messages/browser/' + message.group, jsonString);
    } else if (subscriptions.speech.length > 0) {
        bayeuxClient.publish('/messages/speech/' + message.group, jsonString);
    }

    // Queue for delivery by agents
    redisClient.rpush('messages:queued', jsonString);

    // Archive for display by future clients or agents
    if (!message.hasOwnProperty('noarchive') || message.noarchive === 0) {
        redisClient.rpush('messages:archived', jsonString);
    }

    res.send(204);
});

// Endpoint for archived messages
app.get('/archive/:num', function (req, res) {
    redisClient.lrange('messages:archived', -5, -1, function (err, messages) {
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
