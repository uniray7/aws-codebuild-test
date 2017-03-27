import forEach from 'lodash/forEach';
import merge from 'lodash/merge';

import panophoto from './api/panophoto';

// Add api to global variable
window.verpix = merge({}, window.verpix, {
  createPanophoto: panophoto.create,
});

window.addEventListener('load', () => {
  // Create panophoto(s) from DOM elements
  const roots = document.getElementsByClassName('verpix-panophoto');
  forEach(roots, (root) => {
    const params = {
    };

    panophoto.create(root, params, (err, instance) => {
      if (err) {
        instance.showAltPhoto();
      } else {
        instance.start();
      }
    });
  });
});
