var favicon = require('serve-favicon');

function main(public_dir) {
    var path = public_dir + '/favicon/favicon.ico';
    return favicon(path);
}

module.exports = exports = main;
