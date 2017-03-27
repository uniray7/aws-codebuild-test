/* eslint-disable global-require */

const path = require('path');
const webpack = require('webpack');
const merge = require('lodash/merge');

const pkg = require('../package.json');
const baseConfig = require('./base');

const babelConfig = Object.assign({}, pkg.babel, {
  babelrc: false
});

// Webpack configuration
// http://webpack.github.io/docs/configuration.html
const config = {
  // Options affecting the normal modules
  module: {
    preLoaders: [
      {
        test: /\.js?$/,
        include: [
          path.resolve(__dirname, '../src'),
        ],
        loader: 'isparta-instrumenter-loader',
      },
      {
        test: /\.js?$/,
        include: [
          path.resolve(__dirname, '../test'),
        ],
        loader: 'eslint-loader',
      },
    ],
    loaders: [
      {
        test: /\.js?$/,
        include: [
          path.resolve(__dirname, '../test'),
        ],
        loader: `babel-loader?${JSON.stringify(babelConfig)}`,
      },
    ],
  },
};

module.exports = merge(baseConfig, config);
