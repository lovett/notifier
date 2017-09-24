import * as needle from 'needle';

function publishServerEvent(app, user, message) {
    for (const id of Object.keys(app.locals.pushClients)) {
        const res = app.locals.pushClients[id];
        res.write(`event: message\ndata: ${JSON.stringify(message)}\n\n`);
    }
}

function publishPushbullet(app, user, message, tokenValue) {
    let params;

    if (message.hasOwnProperty('retracted')) {
        app.locals.Message.find({
            attributes: ['pushbulletId'],
            where: { publicId: message.retracted },
        }).then((foundMessage) => {
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
        guid: message.publicId,
        title: message.title,
        type: 'note',
    };

    if (message.url) {
        params.type = 'link';
        params.url  = message.url;
    }

    needle.post('https://api.pushbullet.com/v2/pushes', params, {
        password: '',
        username: tokenValue,
    }, (err, res) => {
        if (res.body.error) {
            return false;
        }

        app.locals.Message.update(
            { pushbulletId: res.body.iden },
            { where: { publicId: message.publicId } },
        );
    });
}

function publishWebhook(user, message, tokenValue) {
    delete message.UserId;
    delete message.id;

    const options = {
        json: true,
    };

    needle.post(tokenValue, message, options, (err, res) => {
        if (err) {
            return false;
        }

        if (res.body && res.body.error) {
            return false;
        }

        return true;
    });
}

export default function(app, user, message) {


    if (message.hasOwnProperty('dataValues')) {
        message = message.dataValues;
    }

    publishServerEvent(app, user, message);

    user.getServiceTokens(() => {

        for (const token of user.serviceTokens) {
            if (token.key === 'pushbullet') {
                publishPushbullet(app, user, message, token.value);
            }

            if (token.key === 'webhook') {
                publishWebhook(user, message, token.value);
            }
        }
    });
}
