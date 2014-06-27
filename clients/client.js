var fs = require('fs');
var events = require('events');
var emitter = new events.EventEmitter();
var path = require('path');
var faye = require('faye');
var request = require('request');

/**
 * Set up the Faye client
 * --------------------------------------------------------------------
 *
 * The client gets two custom extensions related to
 * authentication. The incoming extension deals with channel
 * redirects. The outgoing extension adds the auth token to the
 * message.
 *
 * Channel subscription also occurs here, privately. Message arrival
 * will be broadcast via the 'message' event.
 */
var initClient = function (server, auth) {
    var client = new faye.Client(server + '/messages', {
        retry: 10,
        timeout: 45
    });


    var subscribe = function () {
        client.subscribe('/messages/' + auth.channel, function (message) {
            try {
                message = JSON.parse(message);
            } catch (e) {
                console.log(e);
                return;
            }
            
            emitter.emit('message', message);
        });
    };
    
    client.addExtension({
        incoming: function (message, callback) {
            if (!message.error) {
                return callback(message);
            }
            
            var segments = message.error.split('::');
            var code = parseInt(segments[0], 10);
            var value = segments[1];
            
            if (code === 301) {
                auth.channel = value;
                client.unsubscribe();
                subscribe();
            } else {
                emitter.emit('error', message.error);
            }
        },
        outgoing: function(message, callback) {
            if (message.channel !== '/meta/subscribe') {
                return callback(message);
            }
            
            if (!message.ext) {
                message.ext = {};
            }
            message.ext.authToken = auth.token;
            
            return callback(message);
        }
    });

    subscribe(); 
};

/**
 * Request an auth token from the server
 * --------------------------------------------------------------------
 */
var authorize = function (server) {
    var credentialsFile = path.join(process.env.HOME, '.notifier');
    var credentials;

    try {
        credentials = fs.readFileSync(credentialsFile);
    } catch (e) {
        console.error('The credentials file, ' + credentialsFile + ', was not found.');
        process.exit();
    }

    try {
        credentials = JSON.parse(credentials);
    } catch (e) {
        console.error('The credentials file could not be parsed as JSON');
        process.exit();
    }

    request({
        method: 'post',
        uri: server + '/auth',
        form: {
            username: credentials.username,
            password: credentials.password,
            label: 'speakable-client-osx'
        }
    }, function (err, response, body) {
        if (err) {
            console.error(err);
            process.exit();
        }

        try {
            initClient(server, JSON.parse(body));
        } catch (e) {
            console.error(err);
            process.exit();
        }
    });
};

module.exports = {
    emitter: emitter,    
    authorize: authorize,
    init: initClient
};
