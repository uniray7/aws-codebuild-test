const path = require('path');

// List of allowed environments
const allowedEnvs = ['development', 'production', 'test'];

// Select environment
let env = process.env.NODE_ENV;

// Check the selected environment
if (allowedEnvs.indexOf(env) === -1) {
  env = 'development';
}

let config;

if (env !== 'test') {
  config = require(path.join(__dirname, 'webpack/default'));
} else {
  config = require(path.join(__dirname, 'webpack/test'));
}

module.exports = config;
