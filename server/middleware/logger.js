var fs, morgan;

fs = require('fs');
morgan = require('morgan');

function main(log_path) {
    var stream;

    stream = fs.createWriteStream(
        log_path,
        {flags: 'a'}
    );

    return morgan('combined', {stream: stream});
}

module.exports = exports = main;
