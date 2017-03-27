import MobileDetect from 'mobile-detect';

export default function isIOS() {
  return new MobileDetect(window.navigator.userAgent).os() === 'iOS';
}
