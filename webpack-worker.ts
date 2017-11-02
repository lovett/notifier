import * as webpack from 'webpack';
import {resolve} from 'path';

const config: webpack.Configuration = {
    context: resolve(__dirname, 'worker'),

    devtool: false,

    entry: './worker.ts',

    module: {
        rules: [{
            exclude: /node_modules/,
            test: /\.ts?$/,
            use: 'ts-loader',
        }],
    },

    output: {
        filename: 'worker.js',
        path: resolve(__dirname, 'build/public'),
    },

    plugins: [
        new webpack.optimize.UglifyJsPlugin(),
    ],

    resolve: {
        extensions: ['.ts'],
    },

    target: 'webworker',
};

if (process.env.NODE_ENV === 'dev') {
    config.devtool = 'inline-source-map';
    config.watch = true;
}

export default config;
