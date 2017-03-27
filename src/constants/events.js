import merge from 'lodash/merge';

import { isMobile } from 'lib/devices';

let events = {
  WINDOW_RESIZE: 'resize',
};
if (isMobile()) {
  events = merge({}, events, {
    CLICK_START: 'touchstart',
    CLICK_MOVE: 'touchmove',
    CLICK_END: 'touchend',
    CLICK_CANCEL: 'touchcancel',
  });
} else {
  events = merge({}, events, {
    CLICK_START: 'mousedown',
    CLICK_MOVE: 'mousemove',
    CLICK_END: 'mouseup',
    CLICK_CANCEL: 'mouseout',
    WHEEL: [
      'mousewheel', // IE9, Chrome, Safari, Opera
      'DOMMouseScroll', // Firefox
    ],
  });
}

const EVENTS = events;
export default EVENTS;
