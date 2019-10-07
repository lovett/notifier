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
        message.urlizeBadge(app.locals.config.get('NOTIFIER_BADGE_BASE_URL'));
        jsonMessage = JSON.stringify(message);
    }

    if (retractionId) {
        jsonMessage = JSON.stringify({ retracted: retractionId });
    }

    if (!jsonMessage) {
        return;
    }

    if (!app.locals.pushClients.has(userId)) {
        return;
    }

    const clients = app.locals.pushClients.get(userId);
    for (const res of clients.values()) {
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
