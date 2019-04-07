import { Pool } from 'pg';
import { TokenRecord } from './types/server';

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
        return res.rows;
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
