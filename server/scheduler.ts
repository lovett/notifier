import db from './db';
import publishMessage from './helpers/publish-message';
import { Application } from 'express';

async function scheduler(app: Application): Promise<void> {
    // Clean up old tokens once per hour.
    const now = new Date();
    const elapsedTime = now.getTime() - app.locals.maintenanceTimestamp.getTime();
    const oneHourMs = 1_000 * 60 * 60;

    if (elapsedTime / oneHourMs > 1) {
        await db.pruneStaleTokens();
        app.locals.maintenanceTimestamp = now;
    }

    // Retract expired messages.
    if (app.locals.expirationCache.size === 0) {
        return;
    }

    app.locals.expirationCache.forEach((value: [number, Date], publicId: string) => {
        const [userId, expiration] = value;
        if (expiration < now) {
            publishMessage(app, userId, null, publicId);
            app.locals.expirationCache.delete(publicId);
        }
    });
}

export default scheduler;
