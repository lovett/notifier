import type { NextFunction, Request, Response } from 'express';

/**
 * Remove leading and trailing whitespace from a parsed request body.
 *
 * If there keys in the body with no value, they are set to null.
 *
 * As of body-parser v2, req.body may not start out as an empty object
 * as it previously did in v1.
 */
export default (req: Request, _: Response, next: NextFunction): void => {
  for (const key in req.body ?? {}) {
    if (typeof req.body[key] !== 'string') {
      continue;
    }

    req.body[key] = req.body[key].trim();
    if (req.body[key].length === 0) {
      req.body[key] = null;
    }
  }

  next();
};
