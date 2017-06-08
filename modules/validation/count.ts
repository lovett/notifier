'use strict';

/**
 * Validate a numeric string as a number between 1 and 100
 *
 * @param {Object} req   - Express request object
 * @param {Object} res   - Express resposne object
 * @param {Object} next  - Express middleware callback
 * @param {string} value - The numeric string to validate
 */
function count (req, res, next, value) {
    let count;

    if (/\D/.test(value) === true) {
        res.status = 400;

        return next(new Error('Invalid count'));
    }

    count = parseInt(value, 10);
    count = Math.min(count, 100);
    count = Math.max(count, 1);

    req.params.count = count;

    next();
}

module.exports = exports = count;
