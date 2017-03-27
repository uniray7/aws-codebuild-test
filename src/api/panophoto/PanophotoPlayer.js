/* eslint-disable no-param-reassign */

import THREE from 'three';
import clamp from 'lodash/clamp';
import fill from 'lodash/fill';
import now from 'lodash/now';
import isNumber from 'lodash/isNumber';
import raf from 'raf';

import {
  PARAMS_DEFAULT,
  SCENE_BRIGHTNESS_MODE,
} from 'constants/panophoto';
import { PLAY_MODE } from 'constants/common';
import { isMobile, isIOS, isIframe } from 'lib/devices';
import { getPosition } from 'lib/events/click';
import execute from 'lib/utils/execute';
import EVENTS from 'constants/events';
import GyroNorm from 'external/gyronorm';

const SPHERE_RADIUS = 1000;
const LAT_MAX = 85;
const LAT_MIN = -85;

const BRIGHTENTED_OPACITY = 1;
const DIMMED_OPACITY = 0.7;
const BRIGHTNESS_CHANGE_STEP = 0.005;

const SWIPE = {
  BUFFER_SIZE: isMobile() ? 10 : 20,
  DELTA_FACTOR: 0.0016,
  SMOOTH_DELTA_THRESHOLD: 0.000001,
  PREVENT_STOP_MAGIC_NUMBER: 0.95,
};

const ROTATION = {
  // TODO: test for more devices, to use different factor
  DELTA_FACTOR: isIOS() ? 0.00025 : 0.0125,
};

const AUTO_PLAY = {
  MANUAL_TO_AUTO_MOVEMENT_THRESHOLD: isMobile() ? 30 : 10,
  AUTO_TO_MANUAL_MOVEMENT_THRESHOLD: isMobile() ? 1 : 0.2,
  LNG_DELTA: 0.04,
};

const HIDE_STARTED_BRAND_ROTATION_THRESHOLD = 0.1;

export default class PanophotoPlayer {
  constructor(params) {
    // Read only member variables
    this.container = params.container;
    this.photosSrcUrl = params.photosSrcUrl;
    this.width = params.width;
    this.height = params.height;
    this.altPhoto = params.altPhoto;
    this.brand = params.brand;
    this.tip = params.tip;
    this.initialLng = isNumber(params.initialLng) ? ((params.initialLng + 360) % 360) : 0;
    this.initialLat = isNumber(params.initialLat) ? clamp(params.initialLat, LAT_MIN, LAT_MAX) : 0;
    // eslint-disable-next-line no-unneeded-ternary
    this.isAutoplayEnabled = (params.autoplay === false) ? false : true;
    this.manualToAutoTime =
      (isNumber(params.idleDuration) && params.idleDuration > 0) ?
      parseInt(params.idleDuration * 1000, 10) :
      PARAMS_DEFAULT.MANUAL_TO_AUTO_TIME;
    this.swipeDeltaMagicNumber = PARAMS_DEFAULT.SWIPE_SENSITIVITY * SWIPE.DELTA_FACTOR;
    this.rotationDeltaMagicNumber = PARAMS_DEFAULT.ROTATION_SENSITIVITY * ROTATION.DELTA_FACTOR;
  }

  // Entry function for starting
  start = () => {
    this.resetMemberVars();
    this.startPlay();
  }

  // Entry function for stopping
  stop = () => {
    this.stopPlay();
  }

  // Entry function for getting current coordinates (longitude and latitude)
  getCurrentCoordinates = () => ({
    lng: this.camera.lng,
    lat: this.camera.lat,
  })

  // Entry function for getting snapshot of current view
  // TODO: add option for cropping based on height
  getCurrentSnapshot = ({ quality = 1, ratio }) => {
    // No specified aspect ratio or ratio is not valid, just return the whole view
    if (!isNumber(ratio) || ratio <= 0 || ratio < (this.dimension.width / this.dimension.height)) {
      return this.renderer.domElement.toDataURL('image/jpeg', quality);
    }

    const canvas = document.createElement('CANVAS');
    const ctx = canvas.getContext('2d');
    const cropWidth = this.dimension.width;
    const cropHeight = parseInt(this.dimension.width / ratio, 10);
    const cropX = 0;
    const cropY = parseInt((this.dimension.height - cropHeight) / 2, 10);

    canvas.width = cropWidth;
    canvas.height = cropHeight;
    ctx.drawImage(
      this.renderer.domElement,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    return canvas.toDataURL('image/jpeg', quality);
  }

  // Entry function for setting photos src urls
  setPhotos = (photosSrcUrl) => {
    this.photosSrcUrl = photosSrcUrl;
    this.buildScene(photosSrcUrl);
  }

  // Entry function for setting dimension
  setDimension = (width, height) => {
    this.width = width;
    this.height = height;
    this.updateDimension();
  }

  // Entry function for setting autoplay
  setAutoplay = (autoplay) => {
    // eslint-disable-next-line no-unneeded-ternary
    const newAutoplay = (autoplay === false) ? false : true;

    // Case of changing from enabling to disabling autoplay, and just in autoplay mode
    if ((this.isAutoplayEnabled && !newAutoplay) && (this.play.mode === PLAY_MODE.AUTO)) {
      this.tip.hide();
      this.play.mode = PLAY_MODE.MANUAL;
    }
    // Case of changing from enabling to disabling or disalbing to enabling autoplay
    if (this.isAutoplayEnabled !== newAutoplay) {
      this.autoPlay.startWaitTime = now();
      this.autoPlay.accumulativeMovement = 0;
    }

    this.isAutoplayEnabled = newAutoplay;
  }

  // Initialize or reset writable member variables
  resetMemberVars() {
    // Scene for rendering
    this.scene = null;
    // Renderer
    this.renderer = null;
    // Camera and its related variables
    this.camera = {
      instance: null,
      lng: this.initialLng,
      lat: this.initialLat,
    };
    // Materials
    this.materials = [];
    // The brightness mode of scene
    this.sceneBrightnessMode = SCENE_BRIGHTNESS_MODE.DIM;
    // Position and delta of swipe
    this.swipe = {
      lastPos: null,
      curPos: null,
      lastDeltas: fill(Array(SWIPE.BUFFER_SIZE), {
        x: 0,
        y: 0,
      }),
    };
    // Position and delta of rotation
    this.rotation = {
      gyro: null,
      lastDelta: {
        x: 0,
        y: 0,
      },
    };
    // State about playing
    this.play = {
      mode: PLAY_MODE.NONE,
    };
    // State about autoplaying
    this.autoPlay = {
      startWaitTime: 0,
      accumulativeMovement: 0,
    };
    // The timer for re-rendering
    this.clearAnimationTimer();
    // The timer for updating pixel delta
    this.clearUpdateTimer();
    // Dimension includes width and height of container, window orientation (portrait or landscape)
    this.updateDimension();
    // Reset the brand context
    this.brandContext = {
      instance: this.brand,
      showBrandAtStart: PARAMS_DEFAULT.SHOW_BRAND_AT_START,
      hideStartedBrandAuto: PARAMS_DEFAULT.HIDE_STARTED_BRAND_AUTO,
      hideStartedBrandAutoDuration: PARAMS_DEFAULT.HIDE_STARTED_BRAND_AUTO_DURATION,
    };
    this.brandContext.instance.hide();
    // Hide the tip
    this.tip.hide();
  }

  // Start playing
  startPlay() {
    this.setup();
    this.buildScene(this.photosSrcUrl, () => {
      this.addEventHandlers();
      this.play.mode = PLAY_MODE.MANUAL;
      if (this.isAutoplayEnabled) {
        this.autoPlay.startWaitTime = now();
      }
      if (this.brandContext.showBrandAtStart) {
        this.showStartedBrand();
      }
      this.animationTimer = raf(this.onAnimationFrame);
    });
  }

  // Stop playing
  stopPlay() {
    this.removeEventHandlers();
    this.resetMemberVars();
  }

  // Setup variables about Three
  setup() {
    this.setupCamera();
    this.setupScene();
    this.setupRenderer();
  }

  // Add handlers for DOM events
  addEventHandlers() {
    this.addCommonHandlers();
    this.addSwipeHandlers();
    if (!isMobile()) {
      this.addWheelHandlers();
    } else {
      // TODO: also add handlers for adjusting fov
      this.addRotationHandlers();
    }
  }

  // Remove handlers for DOM events
  removeEventHandlers() {
    this.removeCommonHandlers();
    this.removeSwipeHandlers();
    if (!isMobile()) {
      this.removeWheelHandlers();
    } else {
      // TODO: also remove handlers for adjusting fov
      this.removeRotationHandlers();
    }
  }

  // Add handlers for common events, such as device orientation
  removeCommonHandlers() {
    window.removeEventListener('orientationchange', this.handleOrientationChange);
  }

  // Remove handlers for common events, such as device orientation
  addCommonHandlers() {
    window.addEventListener('orientationchange', this.handleOrientationChange);
  }

  // Add handlers for swipe (click or touch)
  addSwipeHandlers() {
    this.container.addEventListener(EVENTS.CLICK_START, this.handleSwipeStart);
    this.container.addEventListener(EVENTS.CLICK_MOVE, this.handleSwipeMove);
    this.container.addEventListener(EVENTS.CLICK_END, this.handleSwipeEnd);
    this.container.addEventListener(EVENTS.CLICK_CANCEL, this.handleSwipeEnd);
    this.updateTimer = raf(this.onUpdate);
  }

  // Remove handlers for swipe (click or touch)
  removeSwipeHandlers() {
    this.container.removeEventListener(EVENTS.CLICK_START, this.handleSwipeStart);
    this.container.removeEventListener(EVENTS.CLICK_MOVE, this.handleSwipeMove);
    this.container.removeEventListener(EVENTS.CLICK_END, this.handleSwipeEnd);
    this.container.removeEventListener(EVENTS.CLICK_CANCEL, this.handleSwipeEnd);
    this.clearUpdateTimer();
  }

  // Add handlers for mouse wheel
  addWheelHandlers() {
    EVENTS.WHEEL.forEach((wheelEvent) => {
      this.container.addEventListener(wheelEvent, this.handleWheel);
    });
  }

  // Remove handlers for mouse wheel
  removeWheelHandlers() {
    EVENTS.WHEEL.forEach((wheelEvent) => {
      this.container.removeEventListener(wheelEvent, this.handleWheel);
    });
  }

  // Add handlers for gyroscope rotation
  addRotationHandlers() {
    const args = {
      frequency: 70,
      orientationBase: GyroNorm.WORLD,
      screenAdjusted: true,
    };
    this.rotation.gyro = new GyroNorm();
    this.rotation.gyro.init(args).then(() => {
      this.rotation.gyro.start((data) => {
        let delta;
        // TODO: in fact, data.dm is acceleration, not rotation delta
        if (this.dimension.isPortrait) {
          delta = {
            x: data.dm.beta,
            y: data.dm.alpha,
          };
        } else {
          delta = {
            x: data.dm.alpha,
            y: -data.dm.gamma,
          };
        }
        this.updateRotation(delta);
      });
    }).catch(() => {
      // TODO: error handling
    });
  }

  // remove handlers for gyroscope rotation
  removeRotationHandlers() {
    if (this.rotation && this.rotation.gyro) {
      this.rotation.gyro.stop();
    }
  }

  // Setup (perspective) camera
  setupCamera() {
    this.camera.instance = new THREE.PerspectiveCamera(
      Math.round((PARAMS_DEFAULT.FOV_MIN + PARAMS_DEFAULT.FOV_MAX) / 2), // field of view (vertical)
      this.dimension.width / this.dimension.height, // aspect ratio
      0.1, // near plane
      SPHERE_RADIUS + 100 // far plane
    );
  }

  // Setup scene for rendering
  setupScene() {
    this.scene = new THREE.Scene();
  }

  // Setup renderer object
  setupRenderer() {
    // WebGLRenderer for better quality if browser supports WebGL
    const webGLRendererParams = {
      preserveDrawingBuffer: true,
      autoClearColor: false,
      alpha: true,
    };

    // TODO: Use CanvasRenderer for browser without WebGL support
    this.renderer = new THREE.WebGLRenderer(webGLRendererParams);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.autoClear = false;
    // this.renderer.autoClearColor = false;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.dimension.width, this.dimension.height);

    this.container.appendChild(this.renderer.domElement);
  }

  // Generate textrues from images.
  buildScene(imgs, callback) {
    const loader = new THREE.TextureLoader();
    let count = 0;

    loader.crossOrigin = '';
    imgs.forEach((img, index) => {
      loader.load(img, (texture) => {
        // TODO: How to pass the no-param-reassign rule from eslint ?
        texture.minFilter = THREE.LinearFilter;
        this.addMesh(texture, index, imgs.length);
        count++;
        if (count === imgs.length) {
          execute(callback);
        }
      }, () => {
        // TODO: function called when download progresses
      }, () => {
        this.altPhoto.show();
      });
    });
  }

  // "Stick" mesh onto scene
  addMesh(texture, index, totalTiles) {
    const divisor =
      totalTiles > 1 ?
      Math.pow(2, Math.ceil((Math.ceil(Math.log2(totalTiles)) + 1) / 2)) :
      1;
    const j = parseInt(index / divisor, 10);
    const horizontalLength = (Math.PI * 2) / divisor;
    const verticalLength = (totalTiles > 1) ? ((Math.PI * 2) / divisor) : Math.PI;
    const geometry = new THREE.SphereGeometry(
      SPHERE_RADIUS, // sphere radius
      50, // # of horizontal segments
      50, // # of vertical segments
      (horizontalLength * index), // horizontal starting angle
      horizontalLength, // horizontal sweep angle size
      verticalLength * j, // vertical starting angle
      verticalLength // vertical sweep angle size
    );
    geometry.applyMatrix(new THREE.Matrix4().makeScale(-1, 1, 1));
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      overdraw: true,
      transparent: true,
      opacity: DIMMED_OPACITY,
    });
    const mesh = new THREE.Mesh(geometry, material);

    this.materials.push(material);
    this.scene.add(mesh);
  }

  // Update camera related variables and re-render
  onAnimationFrame = () => {
    /* Update longitude and latitude */
    const swipeDelta = this.getSmoothSwipeDelta();
    const rotationDelta = this.getRotationDelta();
    const appliedSwipeDelta = {
      x: swipeDelta.x * this.swipeDeltaMagicNumber,
      y: swipeDelta.y * this.swipeDeltaMagicNumber,
    };
    const appliedRotationDelta = {
      x: rotationDelta.x * this.rotationDeltaMagicNumber,
      y: rotationDelta.y * this.rotationDeltaMagicNumber,
    };
    let newLng = this.camera.lng;
    let newLat = this.camera.lat;

    // Update the accumualtive movement for changing play mode
    // (From manual to auto or from auto to manual)
    if (this.isAutoplayEnabled) {
      this.autoPlay.accumulativeMovement +=
        Math.abs(appliedSwipeDelta.x) +
        Math.abs(appliedRotationDelta.x) +
        Math.abs(appliedSwipeDelta.y) +
        Math.abs(appliedRotationDelta.y);
    }
    // Update camera longitude and latitude,
    // and change to another play mode in some conditions.
    if (this.play.mode === PLAY_MODE.MANUAL) {
      newLng = newLng - appliedSwipeDelta.x - appliedRotationDelta.x;
      newLat = newLat + appliedSwipeDelta.y + appliedRotationDelta.y;

      if (this.isAutoplayEnabled) {
        if (this.autoPlay.accumulativeMovement > AUTO_PLAY.MANUAL_TO_AUTO_MOVEMENT_THRESHOLD) {
          // Accumulative momement exceeds the limit,
          // restart calculating it
          this.autoPlay.startWaitTime = now();
          this.autoPlay.accumulativeMovement = 0;
        } else {
          if ((now() - this.autoPlay.startWaitTime) >= this.manualToAutoTime) {
            // Accumulative momement does not exceed the limit in waiting duration,
            // change from manual to auto mode
            this.play.mode = PLAY_MODE.AUTO;
            this.autoPlay.startWaitTime = now();
            this.autoPlay.accumulativeMovement = 0;
            this.tip.show();
            this.brandContext.instance.show();
            this.dimScene();
          }
        }
      }
    } else if (this.play.mode === PLAY_MODE.AUTO) {
      if (this.isAutoplayEnabled) {
        newLng += AUTO_PLAY.LNG_DELTA;

        if (this.autoPlay.accumulativeMovement >= AUTO_PLAY.AUTO_TO_MANUAL_MOVEMENT_THRESHOLD) {
          // Accumulative momement exceeds the limit,
          // change from auto to manual mode
          this.play.mode = PLAY_MODE.MANUAL;
          this.autoPlay.startWaitTime = now();
          this.autoPlay.accumulativeMovement = 0;
          this.tip.hide();
          this.brandContext.instance.hide();
          this.brightenScene();
        } else {
          if ((now() - this.autoPlay.startWaitTime) >= PARAMS_DEFAULT.AUTO_TO_MANUAL_TIME) {
            // Accumulative momement does not exceed the limit,
            // restart calculating it
            this.autoPlay.startWaitTime = now();
            this.autoPlay.accumulativeMovement = 0;
          }
        }
      }
    }
    this.camera.lng = (newLng + 360) % 360;
    this.camera.lat = clamp(newLat, LAT_MIN, LAT_MAX);

    // Get theta (from longitude) and phi (from latitude)
    const theta = THREE.Math.degToRad(this.camera.lng);
    const phi = THREE.Math.degToRad(90 - this.camera.lat);

    // Change look position of camera
    const target = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta), // x
      Math.cos(phi), // y
      Math.sin(phi) * Math.sin(theta) // z
    );
    this.camera.instance.lookAt(target);

    // Update brightness of scene
    this.updateSceneBrightness();

    // Re-render
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera.instance);
    this.renderer.clearDepth();

    this.animationTimer = raf(this.onAnimationFrame);
  }

  // Update last position and delta of swipe and rotation
  onUpdate = () => {
    this.updateSwipe();
    // this.updateRotation();
    this.updateTimer = raf(this.onUpdate);
  }

  // Update last position and delta of swipe
  updateSwipe() {
    let lastDelta;
    if (this.swipe.curPos !== null && this.swipe.lastPos !== null) {
      lastDelta = {
        x: this.swipe.curPos.x - this.swipe.lastPos.x,
        y: this.swipe.curPos.y - this.swipe.lastPos.y,
      };
    } else {
      lastDelta = {
        x: 0,
        y: 0,
      };
    }
    this.updateSwipeDelta(lastDelta);
    this.swipe.lastPos = this.swipe.curPos;
  }

  // Push last swipe delta to buffer
  updateSwipeDelta(lastDelta) {
    const newDelta = {
      x: lastDelta.x,
      y: lastDelta.y,
    };

    // Prevent suddently stopping
    if (newDelta.x === 0 && Math.abs(this.swipe.lastDeltas[0].x) > SWIPE.SMOOTH_DELTA_THRESHOLD) {
      newDelta.x = this.swipe.lastDeltas[0].x * SWIPE.PREVENT_STOP_MAGIC_NUMBER;
    }
    if (newDelta.y === 0 && Math.abs(this.swipe.lastDeltas[0].y) > SWIPE.SMOOTH_DELTA_THRESHOLD) {
      newDelta.y = this.swipe.lastDeltas[0].y * SWIPE.PREVENT_STOP_MAGIC_NUMBER;
    }

    // Remove the oldest swipe delta
    this.swipe.lastDeltas.pop();
    // Add the newest swipe delta
    this.swipe.lastDeltas.unshift(newDelta);
  }

  // Get smooth swipe delta
  getSmoothSwipeDelta() {
    const sum = this.swipe.lastDeltas.reduce((previous, current) => ({
      x: current.x + previous.x,
      y: current.y + previous.y,
    }));
    const length = this.swipe.lastDeltas.length;
    const avg = {
      x: sum.x / length,
      y: sum.y / length,
    };

    return avg;
  }

  // Update last delta of rotation
  updateRotation(delta) {
    this.rotation.lastDelta = delta;
  }

  // Get rotation delta
  getRotationDelta() {
    return this.rotation.lastDelta;
  }

  // Handler for swipe starting
  handleSwipeStart = (e) => {
    if (this.isHold(e)) {
      this.swipe.curPos = null;
    }
  }

  // Handler for swipe moving
  handleSwipeMove = (e) => {
    if (this.isHold(e)) {
      this.swipe.curPos = getPosition(e);
    }
  }

  // Handler for swipe ending
  handleSwipeEnd = () => {
    this.swipe.curPos = null;
  }

  // handler for mouse wheel
  handleWheel = (e) => {
    let delta = 0;
    if (e.wheelDeltaY) {
      // WebKit (Safari / Chrome)
      delta = -e.wheelDeltaY * 0.05;
    } else if (e.wheelDelta) {
      // Opera / IE 9
      delta -= e.wheelDelta * 0.05;
    } else if (e.detail) {
      // Firefox
      delta += e.detail * 1.0;
    }
    const newFov = this.camera.instance.fov + delta;
    this.camera.instance.fov = clamp(newFov, PARAMS_DEFAULT.FOV_MIN, PARAMS_DEFAULT.FOV_MAX);
    this.camera.instance.updateProjectionMatrix();
  }

  // Handler for device orientation event
  handleOrientationChange = () => {
    this.updateDimension();
  }

  // Update container width, height, and window orientation
  updateDimension() {
    const isPortrait = this.isPortrait();

    this.dimension = {
      isPortrait,
      width: this.width,
      height: this.height,
    };

    if (this.camera && this.camera.instance) {
      // Update camera aspect ratio
      this.camera.instance.aspect = this.dimension.width / this.dimension.height;
      this.camera.instance.updateProjectionMatrix();
    }
    if (this.renderer) {
      // Update renderer size
      this.renderer.setSize(this.dimension.width, this.dimension.height);
    }
  }

  // Show brand at start
  showStartedBrand() {
    this.brandContext.instance.show();
    this.dimScene();

    let hideStartedBrandTimer;
    let rotationCheckTimer;
    const hideStartedBrand = () => {
      if (this.play.mode !== PLAY_MODE.AUTO) {
        this.brandContext.instance.hide();
        this.brightenScene();
        this.container.removeEventListener(EVENTS.CLICK_START, hideStartedBrand);
        clearInterval(rotationCheckTimer);
        clearTimeout(hideStartedBrandTimer);
      }
    };
    // Hide the started brand after first click
    this.container.addEventListener(EVENTS.CLICK_START, hideStartedBrand);
    // Hide the started brand if the device is rotated obviously
    rotationCheckTimer = setInterval(() => {
      const rotationDelta = this.getRotationDelta();
      const appliedRotationDelta = {
        x: rotationDelta.x * this.rotationDeltaMagicNumber,
        y: rotationDelta.y * this.rotationDeltaMagicNumber,
      };
      const rotationMomement =
        Math.abs(appliedRotationDelta.x) +
        Math.abs(appliedRotationDelta.y);
      if (rotationMomement > HIDE_STARTED_BRAND_ROTATION_THRESHOLD) {
        hideStartedBrand();
      }
    }, 20);
    // Automatically hide the started brand after a while
    if (this.brandContext.hideStartedBrandAuto) {
      hideStartedBrandTimer = setTimeout(
        hideStartedBrand,
        this.brandContext.hideStartedBrandAutoDuration
      );
    }
  }

  // Brighten the scene
  brightenScene() {
    if (this.sceneBrightnessMode === SCENE_BRIGHTNESS_MODE.DIM) {
      this.sceneBrightnessMode = SCENE_BRIGHTNESS_MODE.DIM_TO_BRIGTH;
    }
  }

  // Dim the scene
  dimScene() {
    if (this.sceneBrightnessMode === SCENE_BRIGHTNESS_MODE.BRIGHT) {
      this.sceneBrightnessMode = SCENE_BRIGHTNESS_MODE.BRIGHT_TO_DIM;
    }
  }

  // Update the brightness of scene
  updateSceneBrightness() {
    if (this.sceneBrightnessMode === SCENE_BRIGHTNESS_MODE.DIM_TO_BRIGTH) {
      let needMoreBright = false;
      this.materials.forEach((material) => {
        if (material.opacity < BRIGHTENTED_OPACITY) {
          needMoreBright = true;
          material.opacity = Math.min(
            material.opacity + BRIGHTNESS_CHANGE_STEP,
            BRIGHTENTED_OPACITY
          );
        }
      });
      if (!needMoreBright) {
        this.sceneBrightnessMode = SCENE_BRIGHTNESS_MODE.BRIGHT;
      }
    } else if (this.sceneBrightnessMode === SCENE_BRIGHTNESS_MODE.BRIGHT_TO_DIM) {
      let needMoreDim = false;
      this.materials.forEach((material) => {
        if (material.opacity > DIMMED_OPACITY) {
          needMoreDim = true;
          material.opacity = Math.max(
            material.opacity - BRIGHTNESS_CHANGE_STEP,
            DIMMED_OPACITY
          );
        }
      });
      if (!needMoreDim) {
        this.sceneBrightnessMode = SCENE_BRIGHTNESS_MODE.DIM;
      }
    }
  }

  // Return the window orientation is portrait or not
  isPortrait() {
    if (!isMobile()) {
      return true;
    }

    let isPortrait = true;

    if (isNumber(window.orientation)) {
      // In most cases, we can use window.orientation directly
      isPortrait = (window.orientation === 0 || window.orientation === 180);
    } else if (!isIframe() && isNumber(window.innerHeight) && isNumber(window.innerWidth)) {
      // In iframe, (innerWidth, innerHeight) equals to (iframe width, iframe height).
      // In non-iframe, (innerWidth, innerHeight) equals to (viewport width, viewport height).
      // So we can only use them in non-iframe
      isPortrait = window.innerHeight > window.innerWidth;
    } else if (!isIOS() && window.screen && isNumber(window.screen.height) && isNumber(window.screen.width)) { // eslint-disable-line max-len
      // TODO: more tests on other devices
      // In none-iOS, screen width and height depend on current orientation.
      // In iOS, screen width and height are fixed.
      // So we can only use them in non-iOS.
      isPortrait = window.screen.height > window.screen.width;
    } else {
      // TODO: any other case ?
      // For exmaple, maybe we case use window.outerHeight and window.outerWidth,
      // but they return 0 in some devices such as iOS.
    }

    return isPortrait;
  }

  // Clear timer of animation timer (for re-rendering)
  clearAnimationTimer() {
    raf.cancel(this.animationTimer);
    this.animationTimer = null;
  }

  // Clear timer of update timer (for updating pixel delta)
  clearUpdateTimer() {
    raf.cancel(this.updateTimer);
    this.updateTimer = null;
  }

  // Check whether left button is clicked (for mouse) or finger is pressed (for touch)
  isHold(e) {
    return (
      isMobile() ?
      true :
      (e.which && e.button === 0) || (e.button && e.button === 0)
    );
  }
}
