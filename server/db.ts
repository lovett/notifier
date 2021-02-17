import { Pool } from 'pg';
import Message from './Message';
import User from './User';
import Token from './Token';
import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';

let pool: Pool;

export default {
    connect: function (dsn: string): void {
        if (pool) {
            return;
        }

        pool = new Pool({
            connectionString: dsn,
        });
    },

    /**
     * Define the database schema.
     *
     * Looks for SQL files in the schema directory and executes their
     * contents. Queries should be rerunnable, since this normally gets
     * called every time the server starts.
     */
    createSchema: async function createSchema(): Promise<void> {
        const readDir = util.promisify(fs.readdir);
        const readFile = util.promisify(fs.readFile);

        const schemaDir = path.join(__dirname, 'schema');

        const schemaFiles = await readDir(schemaDir);

        for (const schemaFile of schemaFiles) {
            if (schemaFile.endsWith('.sql') === false) {
                continue;
            }

            const sql = await readFile(path.join(schemaDir, schemaFile));

            try {
                await pool.query(sql.toString());
            } catch (err) {
                console.log(err);
                return;
            }
        }
    },

    getUser: async function (username: string): Promise<User | null> {
        const sql = `SELECT id, username, password_hash as "passwordHash", ` +
            `created_at as "createdAt" ` +
            `FROM users WHERE username=$1`;

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
    },

    getUserByToken: async function(key: string, value: string): Promise<User | null> {
        const sql = `SELECT user_id, label, persist ` +
            `FROM tokens ` +
            `WHERE key=$1 ` +
            `AND value=$2`;

        try {
            const res = await pool.query(sql, [key, value]);
            if (res.rows.length === 0) {
                return null;
            }

            const token = new Token(
                res.rows[0].label,
                res.rows[0].persist,
                key,
                value
            );

            return new User({
                id: res.rows[0].user_id,
                token,
            });
        } catch (err) {
            console.log(err);
            return null;
        }
    },

    markTokenSeen: async function (token: Token): Promise<null> {
        const sql = `UPDATE tokens SET last_seen=NOW() ` +
            `WHERE key=$1 AND value=$2`;

        try {
            await pool.query(sql, [token.key, token.value]);
        } catch (err) {
            console.log(err);
        }

        return null;
    },

    addUser: async function (username: string, password: string): Promise<User | null> {
        const sql = `INSERT INTO users (username, password_hash) ` +
            `VALUES ($1, $2) ON CONFLICT DO NOTHING`;

        const passwordHash = User.hashPassword(password);

        if (username.trim() === '' || password.trim() === '') {
            return null;
        }

        try {
            const res = await pool.query(sql, [username, passwordHash]);
            if (res.rowCount === 0) {
                return null;
            }

            return await this.getUser(username);

        } catch (err) {
            console.log(err);
            return null;
        }
    },

    getServiceTokens: async function (userId: number): Promise<Token[]> {
        const sql = `SELECT key, value, label, persist ` +
            `FROM tokens ` +
            `WHERE user_id=$1 ` +
            `AND label IN ('service', 'userval')`;

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
    },

    getWebhookUrls: async function (userId: number): Promise<string[]> {
        const sql = `SELECT value ` +
            `FROM tokens ` +
            `WHERE user_id=$1 ` +
            `AND key='webhook'`;

        try {
            const res = await pool.query(sql, [userId]);
            return res.rows.map((row) => row.value);
        } catch (err) {
            console.log(err);
            return [];
        }
    },

    deleteTokensByKey: async function (userId: number, records: string[]): Promise<boolean> {
        const sql = `DELETE FROM tokens ` +
            `WHERE user_id=$1 ` +
            `AND key = ANY ($2)`;

        try {
            await pool.query(sql, [userId, records]);
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }
    },

    deleteToken: async function (key: string, value: string): Promise<boolean> {
        const sql = 'DELETE FROM tokens WHERE key = $1 AND value = $2';

        try {
            await pool.query(sql, [key, value]);
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }
    },

    addTokens: async function (userId: number, tokens: Token[]): Promise<void> {
        const sql = `INSERT INTO tokens ` +
            `(user_id, key, value, label, persist) ` +
            `VALUES ($1, $2, $3, $4, $5)`;

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
    },

    addMessages: async function (userId: number, messages: Message[]): Promise<void> {
        const sql = `INSERT INTO messages ` +
            `(body, expires_at, group_name, local_id, public_id, ` +
            `source, title, url, received, user_id, badge) ` +
            `VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

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
    },

    markMessagesUnread: async function (userId: number, publicIds: string[]): Promise<boolean> {
        const sql = `UPDATE messages ` +
            `SET unread=true ` +
            `WHERE user_id=$1 ` +
            `AND public_id = ANY ($2)`;

        try {
            await pool.query(sql, [userId, publicIds]);
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }
    },

    markMessagesRead: async function (userId: number, publicIds: string[]): Promise<boolean> {
        const sql = `UPDATE messages ` +
            `SET unread=false ` +
            `WHERE user_id=$1 ` +
            `AND public_id = ANY ($2)`;

        try {
            await pool.query(sql, [userId, publicIds]);
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }
    },

    getMessage: async function (userId: number, publicId: string): Promise<Message | null> {
        const sql = `SELECT public_id as "publicId", title, url, body, badge, source, ` +
            `group_name as "group", received, expires_at as "expiresAt" ` +
            `FROM messages ` +
            `WHERE user_id=$1 ` +
            `AND public_id=$2`;

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
    },

    getUnreadMessages: async function (userId: number, startDate: Date, limit = 50): Promise<Message[]> {
        const sql = `SELECT public_id as "publicId", local_id as "localId", title, url, body, badge, source, ` +
            `group_name as "group", received, expires_at as "expiresAt" ` +
            `FROM messages ` +
            `WHERE user_id=$1 ` +
            `AND unread=true ` +
            `AND received >= $2 ` +
            `AND (expires_at IS NULL OR expires_at > NOW()) ` +
            `ORDER BY received ` +
            `LIMIT $3`;

        try {
            const res = await pool.query(sql, [userId, startDate, limit]);
            return res.rows.map((row) => new Message(row));
        } catch (err) {
            console.log(err);
            return [];
        }
    },

    getRetractableMessageIds: async function (userId: number, localId: string): Promise<string[]> {
        const sql = `SELECT public_id as "publicId" ` +
            `FROM messages ` +
            `WHERE user_id=$1 ` +
            `AND unread=true ` +
            `AND local_id=$2`;

        try {
            const res = await pool.query(sql, [userId, localId]);
            return res.rows.map((row) => row.publicId);
        } catch (err) {
            console.log(err);
            return [];
        }
    },

    getExpiringMessages: async function (): Promise<Map<string, [number, Date]>> {
        const sql = `SELECT public_id as "publicId", user_id as "userId", expires_at as "expiresAt" ` +
            `FROM messages ` +
            `WHERE unread=true ` +
            `AND expires_at > NOW()`;


        const messages: Map<string, [number, Date]> = new Map();

        try {
            const res = await pool.query(sql);

            return res.rows.reduce((accumulator, row) => {
                accumulator.set(row.publicId, [row.userId, row.expiresAt]);
                return accumulator;
            }, messages);
        } catch (err) {
            console.log(err);
            return messages;
        }
    },

    pruneStaleTokens: async function (): Promise<boolean> {
        const sql = `DELETE FROM tokens ` +
            `WHERE DATE_PART('day', now() - last_seen) > 14
             AND key <> 'webhook'`;

        try {
            await pool.query(sql);
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }
    }
}
