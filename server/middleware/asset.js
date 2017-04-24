var express = require('express');

function main(config) {
    return express.static(
        config.get('NOTIFIER_PUBLIC_DIR'),
        {
            setHeaders: function (res) {
                res.set('Cache-Control', 'no-cache, private');
            },
            etag: false
        }
    );
}

module.exports = exports = main;
