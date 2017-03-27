import loadScript from 'load-script';
import isString from 'lodash/isString';

import config from 'config';
import { execute } from 'lib/utils';

const trackers = new Map();
let isSdkLoaded = false;

function send(trackingId, mediaType, mediaId, callback) {
  let tracker = trackers.get(trackingId);

  if (!tracker) {
    tracker = trackers.size + 1;
    ga('create', trackingId, 'auto', tracker);
    trackers.set(trackingId, tracker);
  }

  ga(`${tracker}.send`, {
    hitType: 'event',
    eventCategory: 'Verpix-SDK',
    eventAction: 'create',
    eventLabel: `${mediaType}/${mediaId}`,
    hitCallback: () => execute(callback, null),
  });
}

export default function sendGAEvent(trackingId, mediaType, mediaId, callback) {
  if (isString(trackingId) && trackingId.length > 0) {
    if (!isSdkLoaded) {
      loadScript(config.ga.sdk, (err) => {
        if (err) {
          execute(callback, err);
        } else {
          isSdkLoaded = true;
          send(trackingId, mediaType, mediaId, callback);
        }
      });
    } else {
      send(trackingId, mediaType, mediaId, callback);
    }
  } else {
    execute(callback, null);
  }
}
