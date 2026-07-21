import { setTimeout } from 'node:timers/promises';

import db from './db';

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

    markExpiredMessagesRead: async (intervalMs: number) => {
        console.log(`Marking expired messages as read every ${intervalMs/1000} seconds`);
        while (true) {
            try {
                await db.markExpiredMessagesRead();
            } catch (error) {
                console.log(error);
            } finally {
                await setTimeout(intervalMs, null, {ref: false});
            }
        }
    }
}
