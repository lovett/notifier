import { Pool } from 'pg';
import Message from './Message';
import User from './User';
import Token from './Token';

let pool: Pool;

export function connect(dsn: string) {
    if (pool) {
        return;
    }

    pool = new Pool({
        connectionString: dsn,
    });
}

export async function getUser(username: string): Promise<User | null> {
    const sql = `SELECT id, username, "passwordHash", "createdAt", "updatedAt"
    FROM "Users"
    WHERE username=$1`;

    try {
        const res = await pool.query(sql, [username]);

        if (res.rows.length === 1) {
            return new User(res.rows[0]);
        }

        return null;

    } catch (err) {
        console.log(err);
        return null;
    }
}

export async function getUserByToken(key: string, value: string): Promise<User | null> {
    const sql = `SELECT "UserId" as id
    FROM "Tokens"
    WHERE key=$1
    AND value=$2`;

    try {
        const res = await pool.query(sql, [key, value]);
        if (res.rows.length === 0) {
            return null;
        }

        return new User(res.rows[0]);
    } catch (err) {
        console.log(err);
        return null;
    }
}

export async function addUser(username: string, password: string): Promise<User | null> {
    const sql = `INSERT INTO "Users"
    (username, "passwordHash", "createdAt", "updatedAt")
    VALUES ($1, $2, NOW(), NOW())`;

    const passwordHash = User.hashPassword(password);

    try {
        const res = await pool.query(sql, [username, passwordHash]);
        if (res.rowCount === 0) {
            return null;
        }

        return await getUser(username);

    } catch (err) {
        console.log(err);
        return null;
    }
}

export async function getServiceTokens(userId: number): Promise<Token[]> {
    const sql = `SELECT key, value, label, persist
        FROM "Tokens"
        WHERE "UserId"=$1
        AND label IN ('service', 'userval')`;

    try {
        const res = await pool.query(sql, [userId]);
        return res.rows.map((row) => new Token(
            row.label,
            row.persist,
            row.key,
            row.value,
        ));
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

export async function addTokens(userId: number, tokens: Token[]) {
    const sql = `INSERT INTO "Tokens"
    ("UserId", key, value, label, persist, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`;

    (async () => {
        const client = await pool.connect();

        try {
            for (const token of tokens) {
                await client.query(
                    sql,
                    [
                        userId,
                        token.key,
                        token.value,
                        token.label,
                        token.persist,
                    ],
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

export async function addMessages(userId: number, messages: Message[]) {
    const sql = `INSERT INTO "Messages"
    (body, "expiresAt", "group", "localId", "publicId", source, title, url, received, "UserId", badge)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

    (async () => {
        const client = await pool.connect();

        try {
            for (const message of messages) {
                await client.query(
                    sql,
                    [
                        message.body,
                        message.expiresAt,
                        message.group,
                        message.localId,
                        message.publicId,
                        message.source,
                        message.title,
                        message.url,
                        new Date(),
                        userId,
                        message.badge,
                    ],
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

export async function markMessagesUnread(userId: number, publicIds: string[]) {
    const sql = `UPDATE "Messages"
    SET unread=true
    WHERE "UserId"=$1
    AND "publicId" = ANY ($2)`;

    try {
        await pool.query(sql, [userId, publicIds]);
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

export async function getMessage(userId: number, publicId: string): Promise<Message | null> {
    const sql = `SELECT "publicId", title, url, body, badge, source,
    "group", received, "expiresAt"
    FROM "Messages"
    WHERE "UserId"=$1
    AND "publicId"=$2`;

    try {
        const res = await pool.query(sql, [userId, publicId]);

        if (res.rows.length === 0) {
            return null;
        }

        return new Message(res.rows[0]);
    } catch (err) {
        console.log(err);
        return null;
    }
}

export async function getUnreadMessages(userId: number, startDate: Date, limit: number = 50) {
    const sql = `SELECT "publicId", "localId", title, url, body, badge, source,
    "group", received, "expiresAt"
    FROM "Messages"
    WHERE "UserId"=$1
    AND unread=true
    AND received >= $2
    AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
    ORDER BY received
    LIMIT $3`;

    try {
        const res = await pool.query(sql, [userId, startDate, limit]);
        return res.rows.map((row) => new Message(row));
    } catch (err) {
        console.log(err);
        return [] as Message[];
    }
}

export async function getRetractableMessageIds(userId: number, localId: string) {
    const sql = `SELECT "publicId"
    FROM "Messages"
    WHERE "UserId"=$1
    AND unread=true
    AND "localId"=$2`;

    try {
        const res = await pool.query(sql, [userId, localId]);
        return res.rows.map((row) => row.publicId);
    } catch (err) {
        console.log(err);
        return [] as string[];
    }
}

export async function getExpiringMessages() {
    const sql = `SELECT "publicId", "UserId", "expiresAt"
    FROM "Messages"
    WHERE unread=true
    AND "expiresAt" > NOW()`;

    try {
        const res = await pool.query(sql);

        return res.rows.reduce((accumulator, row) => {
            accumulator.set(row.publicId, [row.UserId, row.expiresAt]);
            return accumulator;
        }, new Map());
    } catch (err) {
        console.log(err);
        return [];
    }
}

export async function pruneStaleTokens() {
    const sql = `DELETE FROM "Tokens"
    WHERE DATE_PART('day', now() - "createdAt") > 7
    AND persist=False`;

    try {
        await pool.query(sql);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}
