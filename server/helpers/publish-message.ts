import * as express from 'express';
import * as needle from 'needle';
import getServiceTokens from '../helpers/service-tokens';
import { Message, MessageInstance, TokenInstance, UserInstance } from '../../types/server';

enum PushbulletType {
    note = 'note',
    link = 'link',
}


interface PushbulletParams {
    body: string;
    guid: string;
    title: string;
    type: PushbulletType;
    url?: string;
}


function publishServerEvent(app: express.Application, _: UserInstance, message: Message) {
    for (const id of Object.keys(app.locals.pushClients)) {
        const res = app.locals.pushClients[id];
        res.write(`event: message\ndata: ${JSON.stringify(message)}\n\n`);
    }
}

function publishPushbullet(app: express.Application, _: UserInstance, message: Message, tokenValue: string) {
    let params;

    if (message.hasOwnProperty('retracted')) {
        app.locals.Message.find({
            attributes: ['pushbulletId'],
            where: { publicId: message.retracted },
        }).then((foundMessage: MessageInstance) => {
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

    params = <PushbulletParams>{
        body: message.body,
        guid: message.publicId,
        title: message.title,
        type: PushbulletType.note,
    };

    if (message.url) {
        params.type = PushbulletType.link;
        params.url  = message.url;
    }

    needle.post('https://api.pushbullet.com/v2/pushes', params, {
        password: '',
        username: tokenValue,
    }, (err: Error, res) => {
        if (err || res.body.error) {
            return false;
        }

        app.locals.Message.update(
            { pushbulletId: res.body.iden },
            { where: { publicId: message.publicId } },
        );

        return true;
    });
}

function publishWebhook(_: UserInstance, message: Message, tokenValue: string) {
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



export default (app: express.Application, user: UserInstance, message: MessageInstance|null, retractionId?: string) => {

    let messageValues: Message;

    if (message) {
        messageValues = message.dataValues;
    } else {
        messageValues = {
            retracted: retractionId,
        };
    }

    publishServerEvent(app, user, messageValues);

    getServiceTokens(app, user, (tokens: TokenInstance[]) => {

        for (const token of tokens) {
            if (token.key === 'pushbullet') {
                publishPushbullet(app, user, messageValues, token.value);
            }

            if (token.key === 'webhook') {
                publishWebhook(user, messageValues, token.value);
            }
        }
    });
};
