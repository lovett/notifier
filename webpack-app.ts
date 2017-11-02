import * as webpack from 'webpack';
import {resolve} from 'path';
import * as ExtractTextPlugin from 'extract-text-webpack-plugin';

const config: webpack.Configuration = {
    context: resolve(__dirname, 'app'),
    devtool: false,
    entry: './app.ts',
    module: {
        rules: [
            {
            loader: 'file-loader?name=[name].[ext]',
            test: /\.png$/,
        },
            {
            test: /\.css$/,
            use: ExtractTextPlugin.extract({
                use: 'css-loader',
            }),
        },
            {
            test: /\.less$/,
            use: ExtractTextPlugin.extract({
                use: [
                    { loader: 'css-loader?sourceMap=false&minimize=true' },
                    { loader: 'less-loader?sourceMap=false' },
                ],
            }),
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
        new ExtractTextPlugin({
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

if (process.env.NODE_ENV === 'dev') {
    config.devtool = 'inline-source-map';
    config.watch = true;
}

export default config;
