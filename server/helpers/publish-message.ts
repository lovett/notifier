import type * as express from 'express';
import * as http from 'node:http';
import * as https from 'node:https';
import db from '../db';
import type Message from '../Message';

function publishWebhook(message: Message, url: string): void {
    const payload = JSON.stringify(message);
    const endpoint = new URL(url);

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'User-Agent': 'notifier'
        }
    };

    let req = https.request(endpoint, options);

    if (endpoint.protocol === 'http:') {
        req = http.request(endpoint, options);
    }

    req.on('error', (err) => {
        console.error(`Webhook POST to ${url} failed: ${err.message}`);
    });

    req.once('response', (res: http.IncomingMessage) => {
        console.log(`Webhook POST to ${url} returned ${res.statusCode}`);
    });

    req.end(payload);
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

    const pushClients = app.locals.pushClients.get(userId);

    if (pushClients) {
        for (const res of pushClients.values()) {
            res.write(`event: message\ndata: ${jsonMessage}\n\n`);
        }
    }

    if (message && message.deliveryStyle !== 'whisper') {
        (async (): Promise<void> => {
            const urls = await db.getWebhookUrls(userId);
            for (const url of urls) {
                publishWebhook(message, url);
            }
        })();
    }
};
