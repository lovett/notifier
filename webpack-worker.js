'use strict';

const {resolve} = require('path');

module.exports = {
    context: resolve(__dirname, 'worker'),
    devtool: false,
    entry: './worker.ts',
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.ts']
    },
    output: {
        filename: 'worker.js',
        path: resolve(__dirname, 'public')
    }
};
