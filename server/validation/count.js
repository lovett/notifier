/**
 * Validate a numeric string as a number between 1 and 100
 *
 * @param {request}  req   - Express request object
 * @param {response} res   - Express resposne object
 * @param {next}     next  - Express middleware callback
 * @param {string}   value - The numeric string to validate
 */
function count (req, res, next, value) {

    if (/\D/.test(value) === true) {
        let err = new Error('Invalid count');
        err.status = 400;
        next(err);
        return;
    }

    let count = parseInt(value, 10);

    count = Math.min(count, 100);
    count = Math.max(count, 1);

    req.params.count = count;

    next();
}

exports = module.exports = count;
