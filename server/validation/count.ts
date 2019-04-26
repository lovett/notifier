import { NextFunction, Request, Response } from 'express';

/**
 * Validate a numeric string as a number between 1 and 100
 */
export default function(req: Request, res: Response, next: NextFunction, value: string) {
    let count: number;

    if (/\D/.test(value) === true) {
        res.status(400);
        throw new Error('Value for count was non-numeric');
    }

    count = parseInt(value, 10);
    count = Math.min(count, 100);
    count = Math.max(count, 1);
    req.params.count = count;
    next();
}
