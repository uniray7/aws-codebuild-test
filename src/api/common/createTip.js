import { applyStyle } from 'lib/dom';
import config from 'config';
import { isMobile } from 'lib/devices';

export default function createTip({ onTop = false }) {
  const tip = new Image();

  // Attributes for tip
  if (isMobile()) {
    tip.src = `${config.staticRoot}/assets/tip-tilt.svg`;
    tip.width = 80;
    tip.height = 60;
  } else {
    tip.src = `${config.staticRoot}/assets/tip-mouse.svg`;
    tip.width = 45;
    tip.height = 45;
  }
  tip.style.opacity = '0';
  tip.style.position = 'absolute';
  tip.style.left = '50%';
  tip.style.bottom = '12px';
  applyStyle(tip, 'pointer-events', 'none');
  applyStyle(tip, 'transform', 'translateX(-50%)');
  if (onTop) {
    tip.style.zIndex = '99999999';
  }
  // states and methods for tip
  tip.isShown = false;
  tip.show = () => {
    if (!tip.isShown) {
      applyStyle(tip, 'transition', 'opacity 2.5s 3s linear');
      tip.style.opacity = '1';
      tip.isShown = true;
    }
  };
  tip.hide = () => {
    if (tip.isShown) {
      applyStyle(tip, 'transition', 'opacity .5s linear');
      tip.style.opacity = '0';
      tip.isShown = false;
    }
  };

  return tip;
}
