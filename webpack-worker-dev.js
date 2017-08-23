'use strict';

const {resolve} = require('path');

module.exports = {
    context: resolve(__dirname, 'worker'),
    devtool: 'inline-source-map',
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
    output: {
        filename: 'worker.js',
        path: resolve(__dirname, 'public')
    },
    resolve: {
        extensions: ['.ts']
    },
    target: 'webworker',
    watch: true,
};
