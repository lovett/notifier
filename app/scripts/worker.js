"use strict";
self.importScripts('faye-browser-min.js');
var client;
var WorkerMessage = (function () {
    function WorkerMessage(event, message) {
        this.payload = { event: event, message: message };
    }
    WorkerMessage.prototype.setChannel = function (value) {
        this.payload.channel = value;
    };
    WorkerMessage.prototype.setRetractions = function (ids) {
        this.payload.retractions = ids;
    };
    WorkerMessage.prototype.send = function () {
        postMessage(this.payload);
    };
    return WorkerMessage;
}());
self.addEventListener('message', function (e) {
    var command = e.data;
    switch (command.action) {
        case "init" /* INIT */:
            init(command.token);
            break;
        case "subscribe" /* SUBSCRIBE */:
            subscribe(command.channel);
            break;
        case "unsubscribe" /* UNSUBSCRIBE */:
            unsubscribe(command.channel);
            break;
        case "disconnect" /* DISCONNECT */:
            disconnect();
            break;
        default:
            return false;
    }
    return true;
});
function init(token) {
    client = new Faye.Client('messages');
    client.addExtension({
        incoming: function (message, callback) {
            var code;
            var segments;
            if (message.error) {
                segments = message.error.split('::');
                code = parseInt(segments[0], 10);
                if (code === 301) {
                    var workerMessage = new WorkerMessage("resubscribe" /* RESUB */);
                    workerMessage.setChannel(segments[1]);
                    return workerMessage.send();
                }
            }
            return callback(message);
        },
        outgoing: function (message, callback) {
            if (message.channel !== '/meta/subscribe') {
                return callback(message);
            }
            if (!message.ext) {
                message.ext = {};
            }
            message.ext.authToken = token;
            return callback(message);
        },
    });
    client.on('transport:down', function () {
        var message = new WorkerMessage("disconnected" /* DISCONNECT */);
        message.send();
    });
    client.on('transport:up', function () {
        var message = new WorkerMessage("connected" /* CONNECT */);
        message.send();
    });
}
function disconnect() {
    client.disconnect();
}
function subscribe(channel) {
    client.subscribe(channel, function (channelMessage) {
        var message;
        var workerMessage;
        try {
            message = JSON.parse(channelMessage);
        }
        catch (exception) {
            console.error('JSON parse failed', exception);
            return false;
        }
        if (message.retracted) {
            workerMessage = new WorkerMessage("drop" /* DROP */);
            workerMessage.setRetractions(message.retracted);
            return workerMessage.send();
        }
        workerMessage = new WorkerMessage("add" /* ADD */, message);
        return workerMessage.send();
    });
}
function unsubscribe(channel) {
    client.unsubscribe(channel);
}
