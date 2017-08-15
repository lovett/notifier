"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var needle = require("needle");
function publishServerEvent(app, user, message) {
    for (var _i = 0, _a = Object.keys(app.locals.pushClients); _i < _a.length; _i++) {
        var id = _a[_i];
        var res = app.locals.pushClients[id];
        res.write("event: message\ndata: " + JSON.stringify(message) + "\n\n");
    }
}
function publishPushbullet(app, user, message, tokenValue) {
    var params;
    if (message.hasOwnProperty('retracted')) {
        app.locals.Message.find({
            attributes: ['pushbulletId'],
            where: { publicId: message.retracted },
        }).then(function (foundMessage) {
            if (foundMessage.pushbulletId === '0') {
                return;
            }
            needle.delete('https://api.pushbullet.com/v2/pushes/' + foundMessage.pushbulletId, null, {
                password: '',
                username: tokenValue,
            });
        });
        return;
    }
    if (message.pushbulletId === '0') {
        return;
    }
    params = {
        body: message.body,
        title: message.title,
        type: 'note',
    };
    if (message.url) {
        params.type = 'link';
        params.url = message.url;
    }
    needle.post('https://api.pushbullet.com/v2/pushes', params, {
        password: '',
        username: tokenValue,
    }, function (err, res) {
        if (res.body.error) {
            return false;
        }
        app.locals.Message.update({ pushbulletId: res.body.iden }, { where: { id: message.id } });
    });
}
function publishWebhook(user, message, tokenValue) {
    delete message.UserId;
    delete message.id;
    var options = {
        json: true,
    };
    needle.post(tokenValue, message, options, function (err, res) {
        if (err) {
            return false;
        }
        if (res.body && res.body.error) {
            return false;
        }
        return true;
    });
}
function default_1(app, user, message) {
    if (message.hasOwnProperty('dataValues')) {
        message = message.dataValues;
    }
    publishServerEvent(app, user, message);
    user.getServiceTokens(function () {
        for (var _i = 0, _a = user.serviceTokens; _i < _a.length; _i++) {
            var token = _a[_i];
            if (token.key === 'pushbullet') {
                publishPushbullet(app, user, message, token.value);
            }
            if (token.key === 'webhook') {
                publishWebhook(user, message, token.value);
            }
        }
    });
}
exports.default = default_1;
//# sourceMappingURL=publish-message.js.map