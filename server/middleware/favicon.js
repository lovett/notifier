var favicon = require('serve-favicon');

function main(config) {
    var path = config.get('NOTIFIER_PUBLIC_DIR') + '/favicon/favicon.ico';
    return favicon(path);
}

exports = module.exports = main;
