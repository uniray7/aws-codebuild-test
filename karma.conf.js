const merge = require('lodash/merge');
const webpack = require('webpack');

const webpackCfg = require('./webpack.config');

const useIframe = process.argv.includes('--iframe');

module.exports = function(config) {
  const browsers = ['PhantomJS'];
  const customLaunchers = {};

  config.set({
    basePath: '',
    browsers,
    customLaunchers,
    files: [
      'test/runner.js'
    ],
    port: 8080,
    captureTimeout: 60000,
    frameworks: [
      'mocha',
      'chai',
      'sinon',
    ],
    client: {
      useIframe,
      mocha: {},
    },
    singleRun: true,
    reporters: [
      'mocha',
      'coverage',
    ],
    preprocessors: {
      'test/runner.js': [
        'webpack',
      ],
    },
    webpack: merge(webpackCfg, {
      plugins: [
        new webpack.DefinePlugin({
          "process.env": {
            PHANTOM: JSON.stringify(true),
          }
        }),
      ],
    }),
    webpackServer: {
      noInfo: true,
    },
    coverageReporter: {
      dir: 'coverage/',
      reporters: [
        { type: 'html' },
        { type: 'text' },
      ],
    },
  });
};
