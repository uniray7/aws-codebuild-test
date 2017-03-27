/* eslint-disable no-param-reassign */

import isDom from 'is-dom';
import isString from 'lodash/isString';
import isNumber from 'lodash/isNumber';

import config from 'config';
import {
  getDataAttribute,
  setDataAttribute,
} from 'lib/dom';
import { CREATE_METHOD } from 'constants/common';
import {
  isArrayOfString,
  sendGAEvent,
  execute,
} from 'lib/utils';
import createContainer from './createContainer';
import constructPhotoUrls from './constructPhotUrls';
import PanophotoPlayer from './PanophotoPlayer';
import optimizeMobile from '../common/optimizeMobile';
import getMedia from '../common/getMedia';

function setWrapperDimension(root, width, height) {
  const wrapperRatio = Math.round((height / width) * 100);

  // TODO: How to pass the no-param-reassign rule from eslint ?
  root.style.width = `${width}px`;
  root.firstChild.style.paddingBottom = `${wrapperRatio}%`;
}

function createInstance({
  root,
  photosSrcUrl,
  altPhotoUrl,
  width,
  height,
  initialLat,
  initialLng,
  autoplay,
  tipOnTop,
  idleDuration,
  logo,
  redirectURL,
  callback,
}) {
  const {
    container,
    altPhoto,
    brand,
    tip,
  } = createContainer(root, width, height, altPhotoUrl, { onTop: tipOnTop }, {
    logo,
    redirectURL,
    onMutation: () => container.remove(),
  });

  const player = new PanophotoPlayer({
    container,
    photosSrcUrl,
    width,
    height,
    initialLat,
    initialLng,
    autoplay,
    idleDuration,
    altPhoto,
    brand,
    tip,
  });
  optimizeMobile(root);
  execute(callback, null, {
    root,
    start: player.start,
    stop: player.stop,
    getCurrentCoordinates: player.getCurrentCoordinates,
    getCurrentSnapshot: player.getCurrentSnapshot,
    setPhotos: player.setPhotos,
    setVisibleSize: (w, h) => {
      setWrapperDimension(root, w, h);
      player.setDimension(w, h);
    },
    setAutoplay: (val) => player.setAutoplay(val),
  });
}

function createErrInstance({
  root,
  altPhotoUrl,
  width,
  height,
  logo,
  redirectURL,
  callback,
  err,
}) {
  const {
    container,
    altPhoto,
  } = createContainer(root, width, height, altPhotoUrl, {}, {
    logo,
    redirectURL,
    onMutation: () => container.remove(),
  });

  execute(callback, err, {
    root,
    showAltPhoto: () => altPhoto.show(),
    hideAltPhoto: () => altPhoto.hide(),
  });
}

export default function create(source, params, callback) {
  let createMethod = CREATE_METHOD.OTHERS;
  let root = document.createElement('DIV');
  let mediaId;
  let photosSrcUrl;
  // TODO: types & values check for parameters
  let width = params.width;
  let height = params.height;
  let initialLat = params.initialLat;
  let initialLng = params.initialLng;
  let autoplay = params.autoplay;
  let altPhotoUrl = params.altPhoto;
  let tipOnTop = params.tipOnTop;
  let idleDuration = params.idleDuration;
  let disableCDN = params.disableCDN;
  let disableGA = params.disableGA;

  if (isDom(source)) {
    // Source is a dom element, just use it.
    createMethod = CREATE_METHOD.DOM;
    root = source;
    // TODO: types & values check for attributes
    mediaId = getDataAttribute(root, 'id');
    width = getDataAttribute(root, 'width');
    height = getDataAttribute(root, 'height');
    initialLat = getDataAttribute(root, 'initial-lat');
    initialLng = getDataAttribute(root, 'initial-lng');
    autoplay = getDataAttribute(root, 'autoplay');
    altPhotoUrl = getDataAttribute(root, 'alt-photo');
    tipOnTop = getDataAttribute(root, 'tip-on-top');
    idleDuration = getDataAttribute(root, 'idle-duration');
    disableCDN = getDataAttribute(root, 'disable-cdn');
    disableGA = getDataAttribute(root, 'disable-ga');
  } else if (isString(source)) {
    // Source is a string, use it as media ID.
    createMethod = CREATE_METHOD.ID;
    mediaId = source;
    setDataAttribute(root, 'id', params.id);
    setDataAttribute(root, 'width', params.width);
    setDataAttribute(root, 'height', params.height);
  } else if (isArrayOfString(source) && source.length > 0) {
    // Source is an array of string, use a as photos source urls.
    createMethod = CREATE_METHOD.PHOTOS_URLS;
    photosSrcUrl = source;
    setDataAttribute(root, 'width', params.width);
    setDataAttribute(root, 'height', params.height);
  }

  if (createMethod === CREATE_METHOD.DOM || createMethod === CREATE_METHOD.ID) {
    getMedia(mediaId).then((res) => {
      const { gaId } = res.owner;
      const { type } = res;
      const {
        lng,
        lat,
      } = res.dimension;

      if (!disableGA) {
        sendGAEvent(config.ga.trackingId, type, mediaId, () => {
          sendGAEvent(gaId, type, mediaId);
        });
      }

      createInstance({
        root,
        photosSrcUrl: constructPhotoUrls(mediaId, res, width, height, disableCDN),
        altPhotoUrl,
        width,
        height,
        initialLat: isNumber(initialLat) ? initialLat : lat,
        initialLng: isNumber(initialLng) ? initialLng : lng,
        autoplay,
        tipOnTop,
        idleDuration,
        callback,
      });
    }).catch((err) => {
      createErrInstance({
        root,
        altPhotoUrl,
        width,
        height,
        callback,
        err,
      });
    });
  } else if (createMethod === CREATE_METHOD.PHOTOS_URLS) {
    createInstance({
      root,
      photosSrcUrl,
      width,
      height,
      initialLat,
      initialLng,
      autoplay,
      tipOnTop,
      idleDuration,
      callback,
    });
  } else {
    createErrInstance({
      root,
      altPhotoUrl,
      width,
      height,
      callback,
      err: new Error('Required argument `source` must be DOM element, string or array of string'),
    });
  }
}
