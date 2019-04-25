import * as express from 'express';
import * as needle from 'needle';
import * as db from '../db';
import Message from '../Message';

function publishWebhook(message: Message, url: string) {
    const options = {
        json: true,
    };

    needle.post(url, message, options, (err, res) => {
        if (err) {
            return false;
        }

        if (res.body && res.body.error) {
            return false;
        }

        return true;
    });
}

export default (app: express.Application, userId: number, message: Message | null, retractionId?: string) => {

    let jsonMessage: string | undefined;

    if (message) {
        jsonMessage = JSON.stringify(message);
    }

    if (retractionId) {
        jsonMessage = JSON.stringify({ retracted: retractionId });
    }

    if (!jsonMessage) {
        return;
    }

    for (const id of Object.keys(app.locals.pushClients)) {
        const res = app.locals.pushClients[id];
        res.write(`event: message\ndata: ${jsonMessage}\n\n`);
    }

    if (!message) {
        return;
    }

    (async () => {
        const urls = await db.getWebhookUrls(userId);
        for (const url of urls) {
            publishWebhook(message, url);
        }
    })();
};
