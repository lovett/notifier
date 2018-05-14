import {Configuration} from 'webpack';
import {resolve} from 'path';
import * as MiniCssExtractPlugin from 'mini-css-extract-plugin';

const mode = (process.env.NODE_ENV !== 'production') ? 'development' : 'production';

const config: Configuration = {
    context: resolve(__dirname, 'app'),

    devtool: false,

    entry: './app.ts',

    mode,

    module: {
        rules: [
            {
                loader: 'file-loader?name=[name].[ext]',
                test: /\.png$/,
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                ],
            },
            {
                test: /\.less$/,
                use: [
                    'css-loader?sourceMap=false&minimize=true',
                    'less-loader?sourceMap=false',
                ],
            },
            {
                exclude: /node_modules/,
                test: /\.ts?$/,
                use: 'ts-loader',
            },
            {
                test: /\.html$/,
                use: 'ng-cache-loader?prefix=templates',
            },
            {
                test: /\.svg$/,
                use: 'file-loader?name=[path][name].[ext]',
            },

        ],
    },

    output: {
        filename: 'app.js',
        path: resolve(__dirname, 'build/public'),
    },

    plugins: [
        new MiniCssExtractPlugin({
            filename: 'app.min.css',
        }),
    ],

    resolve: {
        extensions: ['.ts', '.js', '.html'],
    },

    stats: {
        children: false,
    },
};

if (mode === 'development') {
    config.watch = true;
    config.watchOptions = {
        ignored: /node_modules/,
    };
}

export default config;
