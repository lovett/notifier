import { Pool } from 'pg';
import {TokenRecord} from './types/server';

let pool: Pool;

export function connect(dsn: string) {
    if (pool) {
        return;
    }

    pool = new Pool({
        connectionString: dsn,
    });
}

export function getServiceTokens(userId: number, callback: (rows: TokenRecord[]) => void) {
    const sql = `SELECT key, value, label
        FROM "Tokens"
        WHERE "UserId"=$1
        AND label IN ('service', 'userval')`;

    pool.query(sql, [userId], (err, res) => {
        if (err) {
            throw err;
        }

        callback(res.rows);
    });
}

export function getWebhookUrls(userId: number, callback: (urls: string[]) => void) {
    const sql = `SELECT value
    FROM "Tokens"
    WHERE "UserId"=$1
    AND key='webhook'`;

    pool.query(sql, [userId], (err, res) => {
        if (err) {
            throw err;
        }

        callback(res.rows);
    });
}
