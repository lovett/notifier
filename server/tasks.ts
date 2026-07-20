import { setTimeout } from 'node:timers/promises';

import db from './db';
import publishMessage from './helpers/publish-message';
import type { Application } from 'express';

export default {
    pruneTokens: async (intervalMs: number) => {
        console.log(`Pruning stale tokens every ${intervalMs/1000} seconds`);
        while (true) {
            try {
                await db.pruneStaleTokens();
            } catch (error) {
                console.log(error);
            } finally {
                await setTimeout(intervalMs, null, {ref: false});
            }
        }
    },

    markExpiredMessagesRead: async (intervalMs: number, app: Application) => {
        app.locals.expirationCache = await db.getExpiringMessages();

        console.log(`Marking expired messages as read every ${intervalMs/1000} seconds`);
        while (true) {
            try {
                const now = new Date();

                app.locals.expirationCache.forEach(
                    async (value: [number, Date], key: string) => {
                        const [userId, expiration] = value;
                        const publicId = key;
                        if (expiration > now) {
                            return;
                        }

                        await db.markMessagesRead(userId, [publicId])
                        publishMessage(app, userId, null, publicId);
                        app.locals.expirationCache.delete(publicId);
                    }
                );
            } catch (error) {
                console.log(error);
            } finally {
                await setTimeout(intervalMs, null, {ref: false});
            }
        }
    }
}
