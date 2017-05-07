'use strict';

/**
 * Validate a numeric string as a number between 1 and 100
 *
 * @param {request}  req   - Express request object
 * @param {response} res   - Express resposne object
 * @param {next}     next  - Express middleware callback
 * @param {string}   value - The numeric string to validate
 */
function count (req, res, next, value) {
    let count, err;

    if (/\D/.test(value) === true) {
        err = new Error('Invalid count');
        err.status = 400;

        return next(err);
    }

    count = parseInt(value, 10);
    count = Math.min(count, 100);
    count = Math.max(count, 1);

    req.params.count = count;

    next();
}

module.exports = exports = count;
