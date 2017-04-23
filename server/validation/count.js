function count (req, res, next, value) {
    var count, err;

    if (/\D/.test(value) === true) {
        err = new Error('Invalid count');
        err.status = 400;
        next(err);
    } else {
        count = parseInt(value, 10);

        if (count > 100) {
            count = 100;
        } else if (count === 0) {
            count = 1;
        }

        req.params.count = count;
        next();
    }
}

exports = module.exports = count;
