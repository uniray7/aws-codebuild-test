import MutationObserver from 'mutation-observer';
import isString from 'lodash/isString';

import config from 'config';
import { execute } from 'lib/utils';

export default function createLogo(params = {}) {
  const isCustomRedirectURL = isString(params.redirectURL);
  const isCustomLogo = isString(params.logo);
  const link = document.createElement('a');
  const img = new Image();

  // Attributes for link
  link.href = isCustomRedirectURL ? params.redirectURL : config.redirectURL;
  link.target = '_href';
  link.style.position = 'absolute';
  if (isCustomLogo) {
    link.style.right = '5px';
    link.style.bottom = '3px';
  } else {
    link.style.right = '10px';
    link.style.bottom = '12px';
  }

  // Attributes for image
  if (isCustomLogo) {
    img.src = params.logo;
    img.width = 30;
    img.height = 30;
  } else {
    img.src = `${config.staticRoot}/assets/logo.svg`;
    img.width = 90;
    img.height = 13;
  }

  // Append child
  link.appendChild(img);

  // Detect mutations on link
  const observer = new MutationObserver(() => {
    observer.disconnect();
    execute(params.onMutation);
  });
  const observerConfig = {
    attributes: true,
    childList: true,
    characterData: true,
    subtree: true,
  };
  observer.observe(link, observerConfig);
  link.addEventListener('DOMNodeRemoved', () => {
    execute(params.onMutation);
    observer.disconnect();
    link.removeEventListener('DOMNodeRemoved', this);
  });

  return link;
}
