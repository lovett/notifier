import { NextFunction, Request, Response } from 'express';

export default (err: Error, req: Request, res: Response, next: NextFunction): void => {
    if (req.accepts('json')) {
        res.json({
            message: err.message,
        });
        return;
    }

    next();
};
