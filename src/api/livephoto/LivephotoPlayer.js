/* eslint-disable no-loop-func */

import fill from 'lodash/fill';
import isFunction from 'lodash/isFunction';
import inRange from 'lodash/inRange';
import clamp from 'lodash/clamp';
import raf from 'raf';

import {
  DIRECTION,
  PLAY_MODE,
  AUTO_PLAY_DIR,
  SWIPE_MODE,
} from 'constants/common';
import { LIVEPHOTO_DEFAULT } from 'constants/livephoto';
import EVENTS from 'constants/events';
import { isMobile } from 'lib/devices';
import { isHover } from 'lib/dom';
import { getPosition } from 'lib/events/click';
import Gyro from './Gyro';

const AUTO_PLAY_MAGIC_NUMBER = 100;
const MAX_ROTATION_RANGE = 70;
const TAIL_CONVERGENCE_THRESHOLD = 0.01;
const SMOOTH_INDEX_DELTA_THRESHOLD = 0.00001;
const MAX_FRAME_PERIOD = 70;
const MIN_FRAME_PERIOD = 5;
const RELEASE_SWIPE_MAGIC_NUMBER = 10;
const SWIPE_MODE_CHAGE_PERIOD_UNIT = 16;

export default class LivephotoPlayer {
  constructor(params) {
    // Read only member variables
    this.container = params.container;
    this.tip = params.tip;
    this.direction = params.direction;
    if (params.photosSrcUrl) {
      this.setPhotosSrcUrl(params.photosSrcUrl);
    } else if (params.photos) {
      this.setPhotos(params.photos);
    } else {
      // TODO: error handling
    }
  }

  // Initialize or reset writable member variables
  resetMemberVars() {
    // Member variables for common usage
    if (this.photosSrcUrl) {
      this.photos = fill(Array(this.numPhotos), null);
      this.numLoadedPhotos = 0;
    }
    this.isPlayerEnabled = false;
    this.tip.hide();
    this.pixelStepDistance = this.getNewPixelStepDistance();
    this.curPhoto = -1;
    this.playMode = PLAY_MODE.NONE;
    this.lastPixel = null;
    this.curPixel = null;
    this.lastRotation = null;
    this.curRotation = null;
    this.gyro = null;
    this.lastRotationIndexDelta = 0;
    this.lastIndexDeltas = fill(Array(LIVEPHOTO_DEFAULT.MOVE_BUFFER_SIZE), 0);
    this.updateTimer = null;
    this.animationTimer = null;
    this.swipe = {
      mode: SWIPE_MODE.RELEASE,
      isWaitNoneToRelease: false,
      noneToReleaseTimeout: null,
    };

    // Member variables for auto play
    this.autoPlayDir = AUTO_PLAY_DIR.STL;
    this.isWaitManualToAuto = false;
    this.manualToAutoTimeout = null;
    this.isWaitAutoToManual = false;
    this.autoToManualIntervl = null;
    this.countToAutoPlay = this.thresholdToAutoPlay;
    this.countToManualPlay = this.thresholdToManualPlay;
  }

  start = () => {
    // Writable member variables
    this.resetMemberVars();

    // Start loading and rending photos
    const startIndex = Math.round(this.numPhotos / 2);

    if (this.photosSrcUrl) {
      const loadStep = Math.round(LIVEPHOTO_DEFAULT.CONCURRENT_LOADING_PHOTOS / 2);
      this.loadPhoto(startIndex, this.renderPhoto.bind(this, startIndex));
      this.loadPhotos(startIndex - 1, -1, -loadStep);
      this.loadPhotos(startIndex + 1, this.numPhotos, loadStep);
    } else if (this.photos) {
      this.isPlayerEnabled = true;
      this.renderPhoto(startIndex);
      this.startPlay();
    } else {
      // TODO; error handling
    }
  }

  stop = () => {
    this.stopPlay();
  }

  setPhotosSrcUrl = (photosSrcUrl) => {
    this.photosSrcUrl = photosSrcUrl;
    this.numPhotos = this.photosSrcUrl.length;
    this.setMagicNumbers(this.numPhotos);
  }

  setPhotos = (photos) => {
    this.photos = photos;
    this.numPhotos = photos.length;
    this.setMagicNumbers(this.numPhotos);

    if (this.isPlayerEnabled) {
      this.renderPhoto(this.curPhoto);
    }
  }

  setMagicNumbers = (numPhotos) => {
    this.playThreshold = numPhotos * LIVEPHOTO_DEFAULT.PLAY_THRESHOLD;
    this.pixelStepMagicNumber = (100 - LIVEPHOTO_DEFAULT.SWIPE_SENSITIVITY) / 100;
    this.rotationStepMagicNumber = (100 - LIVEPHOTO_DEFAULT.GYRO_SENSITIVITY) / 100;
    this.rotationStepDistance =
      (MAX_ROTATION_RANGE * this.rotationStepMagicNumber) / numPhotos;
    this.thresholdToAutoPlay =
      Math.round(LIVEPHOTO_DEFAULT.MANUAL_TO_AUTO_THRESHOLD / AUTO_PLAY_MAGIC_NUMBER);
    this.thresholdToManualPlay =
      Math.round(LIVEPHOTO_DEFAULT.AUTO_TO_MANUAL_THRESHOLD / AUTO_PLAY_MAGIC_NUMBER);
  }

  loadPhoto(index, callback) {
    const img = new Image();
    img.src = this.getPhotoSrc(index);
    img.onload = () => {
      this.photos[index] = img;
      this.numLoadedPhotos++;
      if (!this.isPlayerEnabled && this.numLoadedPhotos >= this.playThreshold) {
        this.isPlayerEnabled = true;
        this.startPlay();
      }
      if (callback && isFunction(callback)) {
        callback();
      }
    };
  }

  loadPhotos(start, end, step) {
    if (step > 0 && start < end) {
      let curIndex = start;
      for (;(curIndex < start + step) && (curIndex < end); curIndex++) {
        const callback = () => {
          if (curIndex < end) {
            this.loadPhoto(curIndex, callback);
          }
          curIndex++;
        };
        this.loadPhoto(curIndex, callback);
      }
    } else if (step < 0 && start > end) {
      let curIndex = start;
      for (;(curIndex > start + step) && (curIndex > end); curIndex--) {
        const callback = () => {
          if (curIndex > end) {
            this.loadPhoto(curIndex, callback);
          }
          curIndex--;
        };
        this.loadPhoto(curIndex, callback);
      }
    }
  }

  getPhotoSrc(index) {
    return (
      inRange(index, this.numPhotos) ?
      this.photosSrcUrl[index] :
      ''
    );
  }

  startPlay() {
    if (this.isPlayerEnabled) {
      this.tip.show();
      this.container.addEventListener(EVENTS.CLICK_START, this.handleTransitionStart);
      this.container.addEventListener(EVENTS.CLICK_MOVE, this.handleTransitionMove);
      this.container.addEventListener(EVENTS.CLICK_END, this.handleTransitionEnd);
      this.container.addEventListener(EVENTS.CLICK_CANCEL, this.handleTransitionEnd);
      window.addEventListener(EVENTS.WINDOW_RESIZE, this.handleWindowResize);
      if (isMobile()) {
        this.gyro = new Gyro(this.handleRotation);
        this.gyro.start();
      }
      this.playMode = PLAY_MODE.MANUAL;
      this.onAnimationFrame();
      raf(this.updateIndexDelta);
    }
  }

  stopPlay() {
    this.tip.hide();
    this.container.removeEventListener(EVENTS.CLICK_START, this.handleTransitionStart);
    this.container.removeEventListener(EVENTS.CLICK_MOVE, this.handleTransitionMove);
    this.container.removeEventListener(EVENTS.CLICK_END, this.handleTransitionEnd);
    this.container.removeEventListener(EVENTS.CLICK_CANCEL, this.handleTransitionEnd);
    window.removeEventListener(EVENTS.WINDOW_RESIZE, this.handleWindowResize);
    if (isMobile()) {
      this.gyro.stop();
    }
    this.clearAnimationTimer();
    this.clearUpdateTimer();
    this.clearContainer();
    this.resetMemberVars();
  }

  startWaitManualToAuto() {
    if (this.playMode === PLAY_MODE.MANUAL && !this.isWaitManualToAuto) {
      this.isWaitManualToAuto = true;
      this.countToAutoPlay = this.thresholdToAutoPlay;
      this.manualToAutoTimeout = setTimeout(() => {
        if (this.countToAutoPlay > 0) {
          this.playMode = PLAY_MODE.AUTO;
          this.tip.show();
        }
        this.isWaitManualToAuto = false;
        this.manualToAutoTimeout = null;
      }, LIVEPHOTO_DEFAULT.MANUAL_TO_AUTO_THRESHOLD);
    }
  }

  stopWaitManualToAuto() {
    if (this.isWaitManualToAuto && this.manualToAutoTimeout !== null) {
      this.isWaitManualToAuto = true;
      clearTimeout(this.manualToAutoTimeout);
      this.isWaitManualToAuto = false;
      this.manualToAutoTimeout = null;
    }
  }

  startWaitAutoToManual() {
    if (this.playMode === PLAY_MODE.AUTO && !this.isWaitAutoToManual) {
      this.isWaitAutoToManual = true;
      this.countToManualPlay = this.thresholdToManualPlay;
      this.autoToManualTimeout = setTimeout(() => {
        if (this.countToManualPlay <= 0) {
          this.playMode = PLAY_MODE.MANUAL;
        }
        this.isWaitAutoToManual = false;
        this.autoToManualTimeout = null;
      }, LIVEPHOTO_DEFAULT.AUTO_TO_MANUAL_THRESHOLD);
    }
  }

  stopWaitAutoToManual() {
    if (this.isWaitAutoToManual && this.autoToManualTimeout !== null) {
      clearTimeout(this.autoToManualTimeout);
      this.isWaitAutolToManual = false;
      this.autoToManualTimeout = null;
    }
  }

  updateIndexDelta = () => {
    const isHovering = isHover(this.container);
    const pixelIndexDelta = this.getPixelIndexDelta();
    const rotationIndexDelta = this.getRotationIndexDelta();
    const absIndexDelta = Math.abs(pixelIndexDelta) + Math.abs(rotationIndexDelta);
    let indexDelta = 0;

    // Force switching auto to manual mode when mouse hovering
    if (isHovering && this.playMode === PLAY_MODE.AUTO) {
      this.playMode = PLAY_MODE.MANUAL;
      this.tip.hide();
      if (this.isWaitAutoToManual) {
        this.stopWaitAutoToManual();
      }
      if (this.isWaitManualToAuto) {
        this.stopWaitManualToAuto();
      }
    }

    // Calculate indexDelta for different mode
    if (this.playMode === PLAY_MODE.AUTO && LIVEPHOTO_DEFAULT.AUTO_PLAY_ENABLED) {
      if (this.autoPlayDir === AUTO_PLAY_DIR.STL) {
        if ((this.curPhoto === this.numPhotos - 1) || !this.photos[this.curPhoto]) {
          // Reach to the edge, suspend for a while
          this.autoPlayDir = AUTO_PLAY_DIR.NONE;
          setTimeout(() => {
            this.autoPlayDir = AUTO_PLAY_DIR.LTS;
          }, LIVEPHOTO_DEFAULT.AUTO_PLAY_SUSPEND_PERIOD);
        } else {
          // No the edge, just move to next photo
          indexDelta = 1;
        }
      } else if (this.autoPlayDir === AUTO_PLAY_DIR.LTS) {
        if ((this.curPhoto === 0) || !this.photos[this.curPhoto]) {
          // Reach to the edge, suspend for a while
          this.autoPlayDir = AUTO_PLAY_DIR.NONE;
          setTimeout(() => {
            this.autoPlayDir = AUTO_PLAY_DIR.STL;
          }, LIVEPHOTO_DEFAULT.AUTO_PLAY_SUSPEND_PERIOD);
        } else {
          // No the edge, just move to previous photo
          indexDelta = -1;
        }
      }
      this.countToManualPlay -= absIndexDelta;
      if (LIVEPHOTO_DEFAULT.AUTO_PLAY_ENABLED && !this.isWaitAutoToManual) {
        this.startWaitAutoToManual();
      }
    } else if (this.playMode === PLAY_MODE.MANUAL) {
      // TODO: please use both pixelIndexDelta and rotationIndexDelta
      indexDelta = pixelIndexDelta;
      this.countToAutoPlay -= absIndexDelta;
      if (LIVEPHOTO_DEFAULT.AUTO_PLAY_ENABLED && !this.isWaitManualToAuto && !isHovering) {
        this.startWaitManualToAuto();
      }
    }
    this.lastRotationIndexDelta = rotationIndexDelta;
    this.pushLastIndexDelta(indexDelta);

    this.lastPixel = this.curPixel;
    this.lastRotation = this.curRotation;

    this.updateTimer = raf(this.updateIndexDelta);
  }

  onAnimationFrame = () => {
    let nextFramePeriod = 0;
    let move = 0;

    const smoothIndexDelta = this.getSmoothIndexDelta();
    if (this.playMode === PLAY_MODE.AUTO && LIVEPHOTO_DEFAULT.AUTO_PLAY_ENABLED) {
      nextFramePeriod = Math.round(1000 / LIVEPHOTO_DEFAULT.AUTO_PLAY_RATE);
      move = Math.round(smoothIndexDelta);
    } else if (this.playMode === PLAY_MODE.MANUAL) {
      if (!isMobile() || Math.abs(this.lastRotationIndexDelta) < 0.5) {
        if (Math.abs(smoothIndexDelta) > SMOOTH_INDEX_DELTA_THRESHOLD) {
          move = (smoothIndexDelta < 0) ? -1 : 1;
          nextFramePeriod = clamp(
            Math.abs(Math.round(50 / smoothIndexDelta)),
            MIN_FRAME_PERIOD,
            MAX_FRAME_PERIOD
          );
        }
      } else {
        // TODO: also apply smooth rotation index delta on mobile
        move = Math.round(this.lastRotationIndexDelta);
      }
    }

    if (move !== 0) {
      if (this.playMode === PLAY_MODE.MANUAL) {
        this.tip.hide();
      }
      this.renderPhotoByDelta(move);
    }

    if (nextFramePeriod > 0) {
      this.animationTimer = setTimeout(this.onAnimationFrame, nextFramePeriod);
    } else {
      this.animationTimer = raf(this.onAnimationFrame);
    }
  }

  pushLastIndexDelta(indexDelta) {
    let newIndexDelta = indexDelta;

    // If Detect direction is changed, clear all old history
    if ((this.lastIndexDeltas[0] * newIndexDelta) < 0) {
      this.lastIndexDeltas = fill(Array(LIVEPHOTO_DEFAULT.MOVE_BUFFER_SIZE), 0);
    }
    // Apply "long tail slow down"
    if (newIndexDelta === 0 && Math.abs(this.lastIndexDeltas[0]) > TAIL_CONVERGENCE_THRESHOLD) {
      newIndexDelta = this.lastIndexDeltas[0] / 2;
    }
    // Remove the oldest indexDelta
    this.lastIndexDeltas.pop();
    // Add the newest indexDelta
    this.lastIndexDeltas.unshift(newIndexDelta);
  }

  getSmoothIndexDelta() {
    const sum = this.lastIndexDeltas.reduce((previous, current) => current + previous);
    return sum / this.lastIndexDeltas.length;
  }

  getPixelDelta(startPixel, endPixel) {
    let pixelDelta = 0;

    if (this.swipe.mode !== SWIPE_MODE.NONE) {
      const delta =
        this.direction === DIRECTION.HORIZONTAL ?
        endPixel.x - startPixel.x :
        endPixel.y - startPixel.y;
      pixelDelta =
        this.swipe.mode === SWIPE_MODE.HOLD ? delta : delta / RELEASE_SWIPE_MAGIC_NUMBER;
    }

    return pixelDelta;
  }

  getPixelIndexDelta() {
    let indexDelta = 0;

    if (this.lastPixel && this.curPixel) {
      const pixelDelta = this.getPixelDelta(this.lastPixel, this.curPixel);
      indexDelta = pixelDelta / this.pixelStepDistance;
    }

    return indexDelta;
  }

  getRotationIndexDelta() {
    let indexDelta = 0;

    if (this.lastRotation && this.curRotation) {
      const rotationDelta =
        this.direction === DIRECTION.HORIZONTAL ?
        this.curRotation.x - this.lastRotation.x :
        this.curRotation.y - this.lastRotation.y;
      indexDelta = rotationDelta / this.rotationStepDistance;
    }

    return indexDelta;
  }

  renderPhoto(index) {
    if (this.photos[index] && this.curPhoto !== index) {
      this.curPhoto = index;
      const container = this.container;
      const ctx = container.getContext('2d');
      const photo = this.photos[index];

      if (photo instanceof Image) {
        ctx.drawImage(photo, 0, 0, container.width, container.height);
      } else if (photo instanceof ImageData) {
        ctx.putImageData(photo, 0, 0, 0, 0, container.width, container.height);
      }
    }
  }

  renderPhotoByDelta(delta) {
    let newPhoto = this.curPhoto + delta;

    if (delta < 0 && newPhoto < 0) {
      newPhoto = 0;
    } else if (delta > 0 && newPhoto >= this.numPhotos) {
      newPhoto = this.numPhotos - 1;
    }
    this.renderPhoto(newPhoto);
  }

  clearAnimationTimer() {
    clearTimeout(this.animationTimer);
    raf.cancel(this.animationTimer);
    this.animationTimer = null;
  }

  clearUpdateTimer() {
    raf.cancel(this.updateTimer);
    this.updateTimer = null;
  }

  clearContainer() {
    const container = this.container;
    const ctx = container.getContext('2d');
    ctx.clearRect(0, 0, container.width, container.height);
  }

  startWaitNoneToReleaseSwipe() {
    const period =
      LIVEPHOTO_DEFAULT.MOVE_BUFFER_SIZE * SWIPE_MODE_CHAGE_PERIOD_UNIT;
    this.swipe.isWaitNoneToRelease = true;
    this.swipe.noneToReleaseTimeout = setTimeout(() => {
      this.stopWaitNoneToReleaseSwipe();
      this.swipe.mode = SWIPE_MODE.RELEASE;
    }, period);
  }

  stopWaitNoneToReleaseSwipe() {
    clearTimeout(this.swipe.noneToReleaseTimeout);
    this.swipe.noneToReleaseTimeout = null;
    this.swipe.isWaitNoneToRelease = false;
  }

  getNewPixelStepDistance() {
    return (
      this.direction === DIRECTION.HORIZONTAL ?
      (this.container.offsetWidth * this.pixelStepMagicNumber) / this.numPhotos :
      (this.container.offsetHeight * this.pixelStepMagicNumber) / this.numPhotos
    );
  }

  handleWindowResize = () => {
    this.pixelStepDistance = this.getNewPixelStepDistance();
  }

  handleRotation = (rotation) => {
    this.curRotation = rotation;
  }

  handleTransitionStart = (e) => {
    // Left button is clicked (for mouse) or finger is pressed (for touch)
    if (this.isHold(e)) {
      this.curPixel = null;
      this.swipe.mode = SWIPE_MODE.HOLD;
      if (this.swipe.isWaitNoneToRelease) {
        this.stopWaitNoneToReleaseSwipe();
      }
    }
  }

  handleTransitionMove = (e) => {
    if (this.swipe.mode !== SWIPE_MODE.NONE) {
      this.curPixel = getPosition(e);
    } else {
      this.curPixel = null;
    }
  }

  handleTransitionEnd = () => {
    this.curPixel = null;
    if (this.swipe.mode === SWIPE_MODE.HOLD) {
      this.swipe.mode = SWIPE_MODE.NONE;
      this.startWaitNoneToReleaseSwipe();
    }
  }

  isHold(e) {
    return (
      isMobile() ?
      true :
      (e.which && e.button === 0) || (e.button && e.button === 0)
    );
  }
}
