import type { NextFunction, Request, Response } from 'express';

/**
 * Turn off Etag caching.
 */
export default (req: Request, _: Response, next: NextFunction): void => {
    req.app.set('etag', false);
  next();
};
