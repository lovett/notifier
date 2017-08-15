'use strict';

const {resolve} = require('path');

module.exports = {
    context: resolve(__dirname, 'app'),
    devtool: 'inline-source-map',
    entry: './app.ts',
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.html$/,
                use: 'ng-cache-loader?prefix=templates'
            },
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
