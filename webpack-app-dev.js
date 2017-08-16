'use strict';

const {resolve} = require('path');

const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const extractLess = new ExtractTextPlugin({
    filename: 'app.min.css'
});

module.exports = {
    context: resolve(__dirname, 'app'),
    devtool: 'inline-source-map',
    entry: './app.ts',
    module: {
        rules: [
            {
                test: /\.png$/,
                loader: 'file-loader?name=[name].[ext]'
            },
            {
                test: /\.css$/,
                use: ExtractTextPlugin.extract({
                    use: 'css-loader'
                })
            },
            {
                test: /\.less$/,
                use: extractLess.extract({
                    use: [
                        { loader: 'css-loader?sourceMap=false&minimize=true' },
                        { loader: 'less-loader?sourceMap=false' }
                    ]
                })
            },
            {
                test: /\.ts?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.html$/,
                use: 'ng-cache-loader?prefix=templates'
            },
            {
                test: /\.svg$/,
                use: 'file-loader?name=[path][name].[ext]'
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js', '.html']
    },
    stats: {
        children: false
    },
    output: {
        filename: 'app.js',
        path: resolve(__dirname, 'public')
    },
    plugins: [
        new CleanWebpackPlugin(['public']),
        extractLess
    ]
};
