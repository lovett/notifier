'use strict';

let express = require('express');

function main(public_dir) {
    return express.static(
        public_dir,
        {
            setHeaders: function (res) {
                res.set('Cache-Control', 'no-cache, private');
            },
            etag: false
        }
    );
}

module.exports = exports = main;
