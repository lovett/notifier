import * as express from 'express';
import * as needle from 'needle';
import getServiceTokens from '../helpers/service-tokens';
import { Message, MessageInstance, TokenInstance, User } from '../types/server';

function publishServerEvent(app: express.Application, _: User, message: Message) {
    for (const id of Object.keys(app.locals.pushClients)) {
        const res = app.locals.pushClients[id];
        res.write(`event: message\ndata: ${JSON.stringify(message)}\n\n`);
    }
}

function publishWebhook(_: User, message: Message, tokenValue: string) {
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



export default (app: express.Application, user: User, message: MessageInstance|null, retractionId?: string) => {

    let messageValues: Message;

    if (message) {
        messageValues = message.get();
    } else {
        messageValues = {
            retracted: retractionId,
        };
    }

    publishServerEvent(app, user, messageValues);

    getServiceTokens(app, user, (tokens: TokenInstance[]) => {

        for (const token of tokens) {
            if (token.key === 'webhook') {
                publishWebhook(user, messageValues, token.value);
            }
        }
    });
};
