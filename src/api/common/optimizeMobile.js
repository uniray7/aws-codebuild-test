import { isMobile } from 'lib/devices';
import EVENTS from 'constants/events';

export default function optimizeMobile(el) {
  if (isMobile()) {
    el.addEventListener(EVENTS.CLICK_MOVE, (e) => {
      e.preventDefault();
    });
  }
}
