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
            'User-Agent': 'notifier',
        },
    };

    let req = https.request(endpoint, options);

    if (endpoint.protocol === 'http:') {
        req = http.request(endpoint, options);
    }

    req.on('error', (err) => {
        console.error(`Webhook POST to ${url} for ${message.publicId} failed: ${err.message}`);
    });

    req.once('response', (res: http.IncomingMessage) => {
        console.info(`Webhook POST to ${url} for ${message.publicId} returned ${res.statusCode}`);
    });

    req.end(payload);
}

export default (
    app: express.Application,
    userId: number,
    message?: Message,
    retractionId?: string,
): void => {
    let jsonMessage = '';

    if (message) {
        message.urlizeBadge(app.locals.config.NOTIFIER_BADGE_BASE_URL);
        jsonMessage = JSON.stringify(message);
        console.info(`Publishing ${message.publicId}, localId=${message.localId}`);
    }

    if (retractionId) {
        jsonMessage = JSON.stringify({ retracted: retractionId });
        console.info(`Retracting ${retractionId}`);
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
