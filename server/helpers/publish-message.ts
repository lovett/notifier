import * as express from 'express';
import * as needle from 'needle';
import * as db from '../db';
import { Message, MessageInstance } from '../types/server';

function publishServerEvent(app: express.Application, message: Message) {
    for (const id of Object.keys(app.locals.pushClients)) {
        const res = app.locals.pushClients[id];
        res.write(`event: message\ndata: ${JSON.stringify(message)}\n\n`);
    }
}

function publishWebhook(message: Message, tokenValue: string) {
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



export default (app: express.Application, userId: number, message: MessageInstance | null, retractionId?: string) => {

    let messageValues: Message;

    if (message) {
        messageValues = message.get();
    } else {
        messageValues = {
            retracted: retractionId,
        };
    }

    publishServerEvent(app, messageValues);

    (async () => {
        const urls = await db.getWebhookUrls(userId);
        for (const url of urls) {
            publishWebhook(messageValues, url);
        }
    })();
};
