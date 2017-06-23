import * as needle from "needle";

function publishWebsocket(app, user, message) {
    app.locals.bayeuxClient.publish(`/messages/${ user.getChannel() }`, JSON.stringify(message));
}

function publishPushbullet(user, message, tokenValue) {
    let params;

    if (message.pushbulletId === '0') {
        return;
    }

    if (message.hasOwnProperty('retracted')) {
        app.locals.Message.find({
            where: { 'publicId': message.retracted },
            attributes: ['pushbulletId']
        }).then((message) => {
            if (message.pushbulletId === '0') {
                return;
            }
            needle.delete('https://api.pushbullet.com/v2/pushes/' + message.pushbulletId, null, {
                'username': tokenValue,
                'password': ''
            });
        });
        return;
    }

    params = {
        'title': message.title,
        'body': message.body,
        'type': 'note',
    };

    if (message.url) {
        params.type = 'link';
        params.url  = message.url;
    }

    needle.post('https://api.pushbullet.com/v2/pushes', params, {
        'username': tokenValue,
        'password': ''
    }, (err, res) => {
        if (res.body.error) {
            return false;
        }

        app.locals.Message.update(
            { pushbulletId: res.body.iden },
            { where: { id: message.id } }
        );
    });
}

function publishWebhook(user, message, tokenValue) {
    delete message.UserId;
    delete message.id;

    let options = {
        json: true
    }

    needle.post(tokenValue, message, options, (err, res) => {
        if (res.body.error) {
            return false;
        }
    });
}

export default function (app, user, message) {

    publishWebsocket(app, user, message);

    user.getServiceTokens(() => {

        for (let token of user.serviceTokens) {
            if (token.key === 'pushbullet') {
                //publishPushbullet(user, message.dataValues, token.value)
            }

            if (token.key === 'webhook') {
                publishWebhook(user, message.dataValues, token.value);
            }
        }
    });
}
