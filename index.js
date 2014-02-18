var CONFIG = require('config');
var https = require('https');
var fs = require('fs');
var faye = require('faye');
var express = require('express');
var app = express();
var redisClient = require('redis').createClient();

redisClient.select(CONFIG.redis.dbnum);

// Websocket endpoint for browser clients
var bayeux = new faye.NodeAdapter({
    mount: '/faye',
    timeout: 45
});

var bayeauxClient = bayeux.getClient();


//app.use(express.compress());

// Express should only accept regular, urlencoded requests.
// No json, no file uploads.
app.use(express.urlencoded());


app.use(function(req, res, next){
    console.log('%s %s', req.method, req.url);
    next();
});

if (CONFIG.auth.enabled === 1) {
    app.use(express.basicAuth(CONFIG.auth.username, CONFIG.auth.password));
}

// Static fileserving
app.use(express.static(__dirname + '/public'));

// Endpoint for receiving messages
app.post('/message', function (req, res) {
    var message = {};
    var keys = ['title', 'url', 'body', 'source', 'group', 'noarchive', 'event'];
    var json_string;

    keys.forEach(function (key) {
        if (req.body.hasOwnProperty(key)) {
            message[key] = req.body[key];
        }
    });

    if (Object.keys(message).length === 0) {
        res.send(404, 'Message is empty');
    }

    message.received = +new Date();

    json_string = JSON.stringify(message);

    // Immediately send to any connected clients
    bayeauxClient.publish('/messages/' + message.group, json_string);

    // Queue for delivery by agents
    redisClient.rpush('messages:queued', json_string);

    // Archive for display by future clients or agents
    if (!message.hasOwnProperty('noarchive') || message.noarchive === 0) {
        redisClient.rpush('messages:archived', json_string);
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

console.log('Listening on port ' + CONFIG.http.port);
