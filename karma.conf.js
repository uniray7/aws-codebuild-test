const merge = require('lodash/merge');
const webpack = require('webpack');

const webpackCfg = require('./webpack.config');

const useIframe = process.argv.includes('--iframe');
const completed = process.argv.includes('--completed');

module.exports = function(config) {
  const customLaunchers = !completed ? {} : {
    // Chrome on Windows
    'SL_Chrome': {
      base: 'SauceLabs',
      browserName: 'chrome',
      version: '49.0',
      platform: 'Windows 10',
    },
    // Firefox on Windows
    'SL_Chrome': {
      base: 'SauceLabs',
      browserName: 'firefox',
      version: '40.0',
      platform: 'Windows 10',
    },
    // IE on Windows
    'SL_InternetExplorer': {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      version: '11.0',
      platform: 'Windows 10',
    },
  };
  const browsers =
    !completed ? ['PhantomJS'] : Object.keys(customLaunchers);

  config.set({
    basePath: '',
    browsers,
    customLaunchers,
    files: [
      'test/runner.js'
    ],
    port: 8080,
    captureTimeout: 120000,
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
    reporters: !completed ? [
      'mocha',
      'coverage',
    ] : [
      'mocha',
      'saucelabs',
    ],
    preprocessors: {
      'test/runner.js': [
        'webpack',
      ],
    },
    concurrency: 5,
    webpack: merge(webpackCfg, {
      plugins: [
        new webpack.DefinePlugin({
          "process.env": {
            PHANTOM: !completed ? JSON.stringify(true) : JSON.stringify(false),
          }
        }),
      ],
    }),
    webpackServer: {
      noInfo: true,
    },
    sauceLabs: !completed ? {} : {
      testName: 'Verpix Viewer Testing',
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
