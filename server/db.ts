import { Pool } from 'pg';
import { TokenRecord, MessageRecord } from './types/server';

let pool: Pool;

export function connect(dsn: string) {
    if (pool) {
        return;
    }

    pool = new Pool({
        connectionString: dsn,
    });
}

export async function getServiceTokens(userId: number) {
    const sql = `SELECT key, value, label
        FROM "Tokens"
        WHERE "UserId"=$1
        AND label IN ('service', 'userval')`;

    try {
        const res = await pool.query(sql, [userId]);
        return res.rows;
    } catch (err) {
        console.log(err);
        return [];
    }
}

export async function getWebhookUrls(userId: number) {
    const sql = `SELECT value
    FROM "Tokens"
    WHERE "UserId"=$1
    AND key='webhook'`;

    try {
        const res = await pool.query(sql, [userId]);
        return res.rows.map((row) => row.value);
    } catch (err) {
        console.log(err);
        return [];
    }
}

export async function deleteTokensByKey(userId: number, records: string[]) {
    const sql = `DELETE FROM "Tokens"
    WHERE "UserId"=$1
    AND key = ANY ($2)`;

    try {
        await pool.query(sql, [userId, records]);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

export async function deleteToken(userId: number, key: string, value: string) {
    const sql = `DELETE FROM "Tokens"
    WHERE "UserId"=$1
    AND key = $2
    AND value = $3`;

    try {
        await pool.query(sql, [userId, key, value]);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

export async function addTokens(userId: number, records: TokenRecord[]) {
    const sql = `INSERT INTO "Tokens"
    ("UserId", key, value, label, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, NOW(), NOW())`;

    (async () => {
        const client = await pool.connect();

        try {
            for (const { key, value, label } of records) {
                await client.query(
                    sql,
                    [userId, key, value, label],
                );
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    })().catch((e) => console.error(e.stack));
}

export async function markMessageUnread(userId: number, publicId: string) {
    const sql = `UPDATE "Messages"
    SET unread=true
    WHERE "UserId"=$1
    AND publicId=$2`;

    try {
        await pool.query(sql, [userId, publicId]);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

export async function markMessagesRead(userId: number, publicIds: string[]) {
    const sql = `UPDATE "Messages"
    SET unread=false
    WHERE "UserId"=$1
    AND "publicId" = ANY ($2)`;

    try {
        await pool.query(sql, [userId, publicIds]);
        return true;
    } catch (err) {
        console.log(err);
        return [];
    }
}


export async function getUnreadMessages(userId: number, startDate: Date, limit: number = 50) {
    const sql = `SELECT "publicId", title, url, body, badge, source,
    "group", received, "expiresAt"
    FROM "Messages"
    WHERE "UserId"=$1
    AND unread=true
    AND received >= $2
    AND ("expiresAt" IS NULL OR "expiresAt" < NOW())
    ORDER BY received DESC
    LIMIT $3`;

    try {
        const res = await pool.query(sql, [userId, startDate, limit]);
        return res.rows as MessageRecord[];
    } catch (err) {
        console.log(err);
        return [] as MessageRecord[];
    }
}

export async function getRetractableMessageIds(userId: number, localId: string) {
    const sql = `SELECT "publicId"
    FROM "Messages"
    WHERE "UserId"=$1
    AND "localId"=$2`;

    try {
        const res = await pool.query(sql, [userId, localId]);
        return res.rows as string[];
    } catch (err) {
        console.log(err);
        return [] as string[];
    }
}
