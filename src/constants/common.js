export const DIRECTION = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
};

export const CREATE_METHOD = {
  DOM: 'DOM',
  ID: 'ID',
  PHOTOS_URLS: 'PHOTOS_URLS',
  PHOTOS_DATA: 'PHOTOS_DATA',
  OTHERS: 'OTHERS',
};

export const CUT_BASED_ON = {
  WIDTH: 'width',
  HEIGHT: 'height',
};

export const PLAY_MODE = {
  NONE: 'NONE',
  MANUAL: 'MANUAL',
  AUTO: 'AUTO',
};

export const AUTO_PLAY_DIR = {
  STL: 'SMALL_TO_LARGE',
  LTS: 'LARGE_TO_SMALL',
  NONE: 'NONE',
};

export const SWIPE_MODE = {
  NONE: 'NONE', // Unable to swipe
  HOLD: 'HOLD', // Left button is clicked (for mouse) or finger is pressed (for touch)
  RELEASE: 'RELEASE', // Inverse of hold mode
};

export default {
  DIRECTION,
  CREATE_METHOD,
  CUT_BASED_ON,
  PLAY_MODE,
  AUTO_PLAY_DIR,
};
