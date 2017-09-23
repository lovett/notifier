import * as webpack from 'webpack';
import {resolve} from 'path';
import * as UglifyJSPlugin from 'uglifyjs-webpack-plugin';
import * as ExtractTextPlugin from 'extract-text-webpack-plugin';

const config: webpack.Configuration = {
    context: resolve(__dirname, 'app'),
    devtool: false,
    entry: './app.ts',
    module: {
        rules: [
            {
            test: /\.png$/,
            loader: 'file-loader?name=[name].[ext]',
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
            test: /\.ts?$/,
            use: 'ts-loader',
            exclude: /node_modules/,
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
        path: resolve(__dirname, 'public'),
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
} else {
    config.plugins.push(new UglifyJSPlugin());
}




export default config;
