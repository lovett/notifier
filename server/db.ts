import { Pool } from 'pg';
import Message from './Message';
import User from './User';
import Token from './Token';
import * as util from 'util';
import * as fs from 'fs';

let pool: Pool;

export function connect(dsn: string): void {
    if (pool) {
        return;
    }

    pool = new Pool({
        connectionString: dsn,
    });
}

/**
 * Define the database schema.
 *
 * Looks for SQL files in the schema directory and executes their
 * contents. Queries should be rerunnable, since this normally gets
 * called every time the server starts.
 */
export async function createSchema(): Promise<void> {
    const readDir = util.promisify(fs.readdir);
    const readFile = util.promisify(fs.readFile);

    const schemaFiles = await readDir(__dirname + '/schema');

    for (const schemaFile of schemaFiles) {
        if (schemaFile.endsWith('.sql') === false) {
            continue;
        }

        const sql = await readFile(__dirname + '/schema/' + schemaFile);

        try {
            await pool.query(sql.toString());
        } catch (err) {
            console.log(err);
            return;
        }
    }
}

export async function getUser(username: string): Promise<User | null> {
    const sql = `SELECT id, username, password_hash as "passwordHash", created_at as "createdAt"
    FROM users
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
    const sql = `SELECT user_id as id
    FROM tokens
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
    const sql = `INSERT INTO users (username, password_hash)
    VALUES ($1, $2) ON CONFLICT DO NOTHING`;

    const passwordHash = User.hashPassword(password);

    if (username.trim() === '' || password.trim() === '') {
        return null;
    }

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
        FROM tokens
        WHERE user_id=$1
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

export async function getWebhookUrls(userId: number): Promise<string[]> {
    const sql = `SELECT value
    FROM tokens
    WHERE user_id=$1
    AND key='webhook'`;

    try {
        const res = await pool.query(sql, [userId]);
        return res.rows.map((row) => row.value);
    } catch (err) {
        console.log(err);
        return [];
    }
}

export async function deleteTokensByKey(userId: number, records: string[]): Promise<boolean> {
    const sql = `DELETE FROM tokens
    WHERE user_id=$1
    AND key = ANY ($2)`;

    try {
        await pool.query(sql, [userId, records]);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

export async function deleteToken(key: string, value: string): Promise<boolean> {
    const sql = 'DELETE FROM tokens WHERE key = $1 AND value = $2';

    try {
        await pool.query(sql, [key, value]);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

export async function addTokens(userId: number, tokens: Token[]): Promise<void> {
    const sql = `INSERT INTO tokens
    (user_id, key, value, label, persist)
    VALUES ($1, $2, $3, $4, $5)`;

    (async (): Promise<void> => {
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

export async function addMessages(userId: number, messages: Message[]): Promise<void> {
    const sql = `INSERT INTO messages
    (body, expires_at, group_name, local_id, public_id, source, title, url, received, user_id, badge)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

    (async (): Promise<void> => {
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

export async function markMessagesUnread(userId: number, publicIds: string[]): Promise<boolean> {
    const sql = `UPDATE messages
    SET unread=true
    WHERE user_id=$1
    AND public_id = ANY ($2)`;

    try {
        await pool.query(sql, [userId, publicIds]);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

export async function markMessagesRead(userId: number, publicIds: string[]): Promise<boolean> {
    const sql = `UPDATE messages
    SET unread=false
    WHERE user_id=$1
    AND public_id = ANY ($2)`;

    try {
        await pool.query(sql, [userId, publicIds]);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

export async function getMessage(userId: number, publicId: string): Promise<Message | null> {
    const sql = `SELECT public_id as "publicId", title, url, body, badge, source,
    group_name as "group", received, expires_at as "expiresAt"
    FROM messages
    WHERE user_id=$1
    AND public_id=$2`;

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

export async function getUnreadMessages(userId: number, startDate: Date, limit = 50): Promise<Message[]> {
    const sql = `SELECT public_id as "publicId", local_id as "localId", title, url, body, badge, source,
    group_name as "group", received, expires_at as "expiresAt"
    FROM messages
    WHERE user_id=$1
    AND unread=true
    AND received >= $2
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY received
    LIMIT $3`;

    try {
        const res = await pool.query(sql, [userId, startDate, limit]);
        return res.rows.map((row) => new Message(row));
    } catch (err) {
        console.log(err);
        return [];
    }
}

export async function getRetractableMessageIds(userId: number, localId: string): Promise<string[]> {
    const sql = `SELECT public_id as "publicId"
    FROM messages
    WHERE user_id=$1
    AND unread=true
    AND local_id=$2`;

    try {
        const res = await pool.query(sql, [userId, localId]);
        return res.rows.map((row) => row.publicId);
    } catch (err) {
        console.log(err);
        return [];
    }
}

export async function getExpiringMessages(): Promise<Message[]> {
    const sql = `SELECT public_id as "publicId", user_id as "userId", expires_at as "expiresAt"
    FROM messages
    WHERE unread=true
    AND expires_at > NOW()`;

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

export async function pruneStaleTokens(): Promise<boolean> {
    const sql = `DELETE FROM tokens
    WHERE DATE_PART('day', now() - created_at) > 7
    AND persist=False`;

    try {
        await pool.query(sql);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}
