import { isMobile } from 'lib/devices';

export function getX(e) {
  let x;

  if (isMobile()) {
    x = e.touches[0].pageX - e.target.getBoundingClientRect().left;
  } else {
    x = e.offsetX;
  }

  return x;
}

export function getY(e) {
  let y;

  if (isMobile()) {
    y = e.touches[0].pageY - e.target.getBoundingClientRect().top;
  } else {
    y = e.offsetY;
  }

  return y;
}

export function getPosition(e) {
  return {
    x: getX(e),
    y: getY(e),
  };
}

export default {
  getPosition,
  getX,
  getY,
};
