/* eslint-disable global-require */

const path = require('path');
const webpack = require('webpack');
const pkg = require('../package.json');

const isDebug = global.DEBUG === false ? false : !process.argv.includes('--release');
const isVerbose = process.argv.includes('--verbose') || process.argv.includes('-v');

// Webpack configuration
// http://webpack.github.io/docs/configuration.html
const config = {
  // The base directory for resolving the entry option
  context: __dirname,

  // Switch loaders to debug or release mode
  debug: isDebug,

  // Developer tool to enhance debugging, source maps
  // http://webpack.github.io/docs/configuration.html#devtool
  devtool: isDebug ? 'source-map' : false,

  // What information should be printed to the console
  stats: {
    colors: true,
    reasons: isDebug,
    hash: isVerbose,
    version: isVerbose,
    timings: true,
    chunks: isVerbose,
    chunkModules: isVerbose,
    cached: isVerbose,
    cachedAssets: isVerbose,
  },

  resolve: {
    extensions: ['', '.js'],
    root: path.resolve(__dirname, '../'),
    alias: {
      constants: 'src/constants',
      lib: 'src/lib',
      external: 'external',
      config: 'config',
    },
  },
};

module.exports = config;
