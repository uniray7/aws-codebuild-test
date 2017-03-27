import MobileDetect from 'mobile-detect';

export default function isMobile() {
  const isMo =  Boolean(new MobileDetect(window.navigator.userAgent).mobile());

  if (isMo) {
    return true;
  } else {
    return false;
  }
}
