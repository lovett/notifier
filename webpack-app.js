'use strict';

const {resolve} = require('path');

module.exports = {
    context: resolve(__dirname, 'app'),
    devtool: false,
    entry: './app.ts',
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
        extensions: ['.ts', '.js', '.html']
    },
    output: {
        filename: 'app.js',
        path: resolve(__dirname, 'public')
    }
};
