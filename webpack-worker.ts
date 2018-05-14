import {Configuration} from 'webpack';
import {resolve} from 'path';

const mode = (process.env.NODE_ENV !== 'production') ? 'development' : 'production';

const config: Configuration = {
    context: resolve(__dirname, 'worker'),

    devtool: false,

    entry: './worker.ts',

    mode,

    module: {
        rules: [{
            exclude: /node_modules/,
            test: /\.ts?$/,
            use: 'ts-loader',
        }],
    },

    optimization: {
        minimize: true,
    },

    output: {
        filename: 'worker.js',
        path: resolve(__dirname, 'build/public'),
    },

    resolve: {
        extensions: ['.ts'],
    },

    target: 'webworker',
};

if (mode === 'development') {
    config.watch = true;
    config.watchOptions = {
        ignored: /node_modules/,
    };
}

export default config;
