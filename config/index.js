import devConfig from './development';
import prodConfig from './production';

const config =
  process.env.NODE_ENV === 'production' ?
  prodConfig :
  devConfig;

export default config;
