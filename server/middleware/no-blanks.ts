import { NextFunction, Request, Response } from 'express';

/**
 * Remove leading and trailing whitespace from a parsed request body.
 *
 * If there keys in the body with no value, they are set to null.
 */
export default (req: Request, _: Response, next: NextFunction) => {
    Object.keys(req.body).forEach((key) => {
        const value = req.body[key];
        if (typeof value !== 'string') {
            return;
        }

        req.body[key] = value.trim();

        if (req.body[key].length === 0) {
            req.body[key] = null;
        }
    });
    next();
};
