import db from './db';
import type User from './User';
import publishMessage from './helpers/publish-message';
import type { Application } from 'express';

async function scheduler(app: Application): Promise<void> {
    // Clean up old tokens once per hour.
    const now = new Date();
    const elapsedTime =
        now.getTime() - app.locals.maintenanceTimestamp.getTime();
    const oneHourMs = 1_000 * 60 * 60;

    if (elapsedTime / oneHourMs > 1) {
        await db.pruneStaleTokens();
        app.locals.maintenanceTimestamp = now;
    }

    // Retract expired messages.
    if (app.locals.expirationCache.size === 0) {
        return;
    }

    app.locals.expirationCache.forEach(
        async (value: [User, Date], publicId: string) => {
            const [user, expiration] = value;
            if (expiration < now) {
                await db.markMessagesRead(user.id, [publicId]);
                publishMessage(app, user.id, null, publicId);
                app.locals.expirationCache.delete(publicId);
            }
        },
    );
}

export default scheduler;
