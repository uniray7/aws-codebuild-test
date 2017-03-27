/* eslint-disable no-console, global-require */

const fs = require('fs');
const del = require('del');
const ejs = require('ejs');
const cp = require('shelljs').cp;
const mkdir = require('shelljs').mkdir;
const webpack = require('webpack');

// TODO: Update configuration settings
const config = {
  title: 'Verpix',        // Your website title
  url: 'http://localhost',          // Your website URL
  project: 'verpix-viewer',      // Firebase project. See README.md -> How to Deploy
  trackingID: 'UA-XXXXX-Y',                 // Google Analytics Site's ID
};

const tasks = new Map(); // The collection of automation tasks ('clean', 'build', 'publish', etc.)

function run(task) {
  const start = new Date();
  console.log(`Starting '${task}'...`);
  return Promise.resolve().then(() => tasks.get(task)()).then(() => {
    console.log(`Finished '${task}' after ${new Date().getTime() - start.getTime()}ms`);
  }, err => console.error(err.stack));
}

//
// Clean up the output directory
// -----------------------------------------------------------------------------
tasks.set('clean', () => del(['public/dist/*', '!public/dist/.git'], { dot: true }));

//
// Copy ./index.html into the /public/dist folder
// -----------------------------------------------------------------------------
tasks.set('html', () => {
  const webpackConfig = require('./webpack.config');
  const assets = JSON.parse(fs.readFileSync('./public/dist/assets.json', 'utf8'));
  const template = fs.readFileSync('./public/index.ejs', 'utf8');
  const render = ejs.compile(template, { filename: './public/index.ejs' });
  const output = render({ debug: webpackConfig.debug, sdk: assets.sdk.js, demo: assets.demo.js, config });
  fs.writeFileSync('./public/dist/index.html', output, 'utf8');
});

//
// Generate sitemap.xml
// -----------------------------------------------------------------------------
/*
tasks.set('sitemap', () => {
  const urls = require('./routes.json')
    .filter(x => !x.path.includes(':'))
    .map(x => ({ loc: x.path }));
  const template = fs.readFileSync('./public/sitemap.ejs', 'utf8');
  const render = ejs.compile(template, { filename: './public/sitemap.ejs' });
  const output = render({ config, urls });
  fs.writeFileSync('public/dist/sitemap.xml', output, 'utf8');
});
*/

//
// Bundle JavaScript, CSS and image files with Webpack
// -----------------------------------------------------------------------------
tasks.set('bundle', () => {
  const webpackConfig = require('./webpack.config');
  return new Promise((resolve, reject) => {
    webpack(webpackConfig).run((err, stats) => {
      if (err) {
        reject(err);
      } else {
        console.log(stats.toString(webpackConfig.stats));
        resolve();
      }
    });
  });
});

//
// Copy static files to the public/dist foler
// -----------------------------------------------------------------------------
tasks.set('copy', () => {
  // Each target could be a file or directory
  const targets = ['favicon.ico', 'assets'];
  mkdir('-p', 'public/dist');
  targets.forEach((target) => {
    cp('-R', `public/${target}`, 'public/dist');
    console.log(`File/Directory "${target}" is copied`);
  });
});

//
// Build website into a distributable format
// -----------------------------------------------------------------------------
tasks.set('build', () => {
  global.DEBUG = process.argv.includes('--debug') || false;
  Promise.resolve()
  .then(() => run('clean'))
  .then(() => run('bundle'))
  .then(() => run('html'))
  //.then(() => run('sitemap'))
  .then(() => run('copy'))
});

//
// Build and publish the website
// -----------------------------------------------------------------------------
tasks.set('publish', () => {
  const firebase = require('firebase-tools');
  return run('build')
    .then(() => firebase.login({ nonInteractive: false }))
    .then(() => firebase.deploy({
      project: config.project,
      cwd: __dirname,
    }))
    .then(() => { setTimeout(() => process.exit()); });
});

//
// Build website and launch it in a browser for testing (default)
// -----------------------------------------------------------------------------
tasks.set('start', () => {
  let count = 0;
  global.HMR = !process.argv.includes('--no-hmr'); // Hot Module Replacement (HMR)
  return run('clean').then(() => run('copy')).then(() => new Promise(resolve => {
    const bs = require('browser-sync').create();
    const webpackConfig = require('./webpack.config');
    const compiler = webpack(webpackConfig);
    // Node.js middleware that compiles application in watch mode with HMR support
    // http://webpack.github.io/docs/webpack-dev-middleware.html
    const webpackDevMiddleware = require('webpack-dev-middleware')(compiler, {
      publicPath: webpackConfig.output.publicPath,
      stats: webpackConfig.stats,
    });
    const webpackHotMiddleware = require('webpack-hot-middleware')(compiler);
    compiler.plugin('done', stats => {
      // Generate index.html page
      const sdk = stats.compilation.chunks.find(x => x.name === 'sdk').files[0];
      const demo = stats.compilation.chunks.find(x => x.name === 'demo').files[0];
      const template = fs.readFileSync('./public/index.ejs', 'utf8');
      const render = ejs.compile(template, { filename: './public/index.ejs' });
      const output = render({ debug: true, sdk: `/dist/${sdk}`, demo: `/dist/${demo}`, config });
      fs.writeFileSync('./public/dist/index.html', output, 'utf8');

      // Launch Browsersync after the initial bundling is complete
      // For more information visit https://browsersync.io/docs/options
      if (++count === 1) {
        bs.init({
          port: process.env.PORT || 3000,
          ui: { port: Number(process.env.PORT || 3000) + 1 },
          server: {
            baseDir: 'public/dist',
            middleware: [
              webpackDevMiddleware,
              webpackHotMiddleware,
              // Customized middleware
              (req, res, next) => {
                next();
              },
            ],
          },
        }, resolve);
      }
    });
  }));
});

// Execute the specified task or default one. E.g.: node run build
run(/^\w/.test(process.argv[2] || '') ? process.argv[2] : 'start' /* default */);
