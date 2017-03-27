import isFunction from 'lodash/isFunction';

const RESET_DELAY = 300;

export default class Gyro {
  constructor(callback) {
    this.callback = callback;
    this.isPortrait = null;
    this.needResetRotation = false;
  }

  start() {
    const orientationSupport = !!window.DeviceOrientationEvent;

    if (orientationSupport) {
      window.addEventListener('deviceorientation', this.onDeviceOrientation);
    }
  }

  stop() {
    window.removeEventListener('deviceorientation', this.onDeviceOrientation);
  }

  onDeviceOrientation = (e) => {
    let rotation = null;

    this.updateDimension();
    if (!this.needResetRotation && e.beta !== null && e.gamma !== null) {
      if (this.isPortrait) {
        rotation = {
          x: e.gamma,
          y: e.beta,
        };
      } else {
        rotation = {
          x: e.beta,
          y: e.gamma,
        };
      }
    }
    if (isFunction(this.callback)) {
      this.callback(rotation);
    }
  }

  updateDimension = () => {
    let isPortrait = this.isPortrait;

    if (window.orientation) {
      isPortrait = (window.orientation === 0 || window.orientation === 180);
    } else if (window.innerHeight !== null && window.innerWidth !== null) {
      isPortrait = window.innerHeight > window.innerWidth;
    }

    if (isPortrait !== this.isPortrait) {
      this.isPortrait = isPortrait;
      this.needResetRotation = true;
      setTimeout(() => {
        this.needResetRotation = false;
      }, RESET_DELAY);
    }
  }
}
