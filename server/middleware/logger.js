var fs, morgan;

fs = require('fs');
morgan = require('morgan');

function main(config) {
    var stream;

    stream = fs.createWriteStream(
        config.get('NOTIFIER_ACCESS_LOG'),
        {flags: 'a'}
    );

    return morgan('combined', {stream: stream});
}

module.exports = exports = main;
