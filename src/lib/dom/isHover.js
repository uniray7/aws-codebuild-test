import { isMobile } from 'lib/devices';

let isAdded = false;
let matchFunc = null;

function addIsHover() {
  const prefixes = ['', 'ms', 'moz', 'webkit', 'o'];
  let match;

  for (let i = 0; i < prefixes.length; i++) {
    match = prefixes[i] + (prefixes[i] ? 'Matches' : 'matches');
    if (document.documentElement[match]) {
      matchFunc = match;
      break;
    }
    match += 'Selector';
    if (document.documentElement[match]) {
      matchFunc = match;
      break;
    }
  }
  if (!matchFunc) {
    window.addEventListener('mouseover', (event) => {
      const e = event || window.event;
      let t = e.srcElement || e.target;
      while (t) {
        t.hovering = true;
        t = t.parentNode;
      }
    });
    window.addEventListener('mouseout', (event) => {
      const e = event || window.event;
      let t = e.srcElement || e.target;
      while (t) {
        t.hovering = false;
        t = t.parentNode;
      }
    });
  }
}

export default function isHover(el) {
  let result = false;

  if (!isMobile()) {
    if (!isAdded) {
      addIsHover();
      isAdded = true;
    }
    if (matchFunc) {
      result = el[matchFunc](':hover');
    } else {
      result = el.hovering;
    }
  }

  return result;
}
