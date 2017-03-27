/* eslint-disable max-len */

export const PARAMS_DEFAULT = {
  /* Option default values for common usage */
  SWIPE_SENSITIVITY: 80, // The sensitivity for swiping (mouse or touch moving), range from 1 to 99
  ROTATION_SENSITIVITY: 80, // The sensitivity for gyroscope rotation, range from 1 to 99
  FOV_MIN: 50, // The maximun fov
  FOV_MAX: 85, // The minimum fov
  /* Option default values for brand */
  SHOW_BRAND_AT_START: true, // Show the brand at start or not
  HIDE_STARTED_BRAND_AUTO: false, // If the started brand is shown, hide it automatically or not
  HIDE_STARTED_BRAND_AUTO_DURATION: 8000, // The duration of show time, use when the started brand is hidden automatically
  /* Option default values for autoplay */
  MANUAL_TO_AUTO_TIME: 10000, // The period (in milliseconds) to wait for changing from manual to auto mode
  AUTO_TO_MANUAL_TIME: 100, // The period (milliseconds) to wait for changing from auto to manual mode
};

export const SCENE_BRIGHTNESS_MODE = {
  BRIGHT: 'BRIGHT',
  DIM: 'DIM',
  BRIGHT_TO_DIM: 'BRIGHT_TO_DIM',
  DIM_TO_BRIGTH: 'DIM_TO_BRIGTH',
};

export default {
  PARAMS_DEFAULT,
  SCENE_BRIGHTNESS_MODE,
};
