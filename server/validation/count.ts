import * as express from 'express';

/**
 * Validate a numeric string as a number between 1 and 100
 */
export default function(req: express.Request, res: express.Response, next: express.NextFunction, value: string) {
    let count: number;

    if (/\D/.test(value) === true) {
        res.status(400);
        return next(new Error('Invalid count'));
    }

    count = parseInt(value, 10);
    count = Math.min(count, 100);
    count = Math.max(count, 1);
    req.params.count = count;
    next();
}
