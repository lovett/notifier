import * as express from 'express';
import * as needle from 'needle';
import db from '../db';
import Message from '../Message';

function publishWebhook(message: Message, url: string): void {
    const options = {
        json: true,
    };

    needle.post(url, message, options, (err, res) => {
        console.log(`Webhook POST to {$url} returned ${res.statusCode}`);

        if (err) {
            console.log(err.message);
        }

        if (res.body && res.body.error) {
            console.log(res.body.error);
        }
    });
}

export default (app: express.Application, userId: number, message: Message | null, retractionId?: string): void => {

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

    if (message && message.deliveryStyle === 'whisper') {
        return;
    }

    if (message) {
        (async (): Promise<void> => {
            const urls = await db.getWebhookUrls(userId);
            for (const url of urls) {
                publishWebhook(message, url);
            }
        })();
    }
};
