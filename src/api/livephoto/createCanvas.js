/* eslint-disable no-param-reassign */

import { applyStyle } from 'lib/dom';
import { CUT_BASED_ON } from 'constants/common';
import createTip from '../common/createTip';
import createLogo from '../common/createLogo';

export default function createCanvas(
  root,
  canvasDimension,
  wrapperDimension,
  cutBasedOn,
  logoParams
) {
  const outWrapper = document.createElement('DIV');
  const inWrapper = document.createElement('DIV');
  const tip = createTip({});
  const canvas = document.createElement('CANVAS');
  const logo = createLogo(logoParams);
  const wrapperRatio = Math.round((wrapperDimension.height / wrapperDimension.width) * 100);

  // TODO: How to pass the no-param-reassign rule from eslint ?
  root.style.width = `${wrapperDimension.width}px`;
  root.style.maxWidth = '100%';
  root.style.overflow = 'hidden';

  // Styles for outter wrapper
  outWrapper.style.width = '100%';
  outWrapper.style.paddingBottom = `${wrapperRatio}%`;
  outWrapper.style.position = 'relative';
  outWrapper.style.overflow = 'hidden';

  // Styles for inner wrapper
  let transformStyle;
  if (cutBasedOn !== CUT_BASED_ON.HEIGHT) {
    // Cut based on width
    const heightRatio = Math.round((canvasDimension.height / canvasDimension.width) * 100);

    inWrapper.style.width = '100%';
    inWrapper.style.paddingBottom = `${heightRatio}%`;
    inWrapper.style.position = 'absolute';
    inWrapper.style.top = '50%';
    inWrapper.style.left = '0';
    transformStyle = 'translateY(-50%)';
  } else {
    // Cut based on height
    const widthRatio = Math.round(wrapperRatio * (canvasDimension.width / canvasDimension.height));

    inWrapper.style.width = `${widthRatio}%`;
    inWrapper.style.height = '100%';
    inWrapper.style.position = 'absolute';
    inWrapper.style.top = '0';
    inWrapper.style.left = '50%';
    transformStyle = 'translateX(-50%)';
  }
  applyStyle(inWrapper, 'transform', transformStyle);

  // Attributes for canvas
  canvas.width = canvasDimension.width;
  canvas.height = canvasDimension.height;
  // styles for canvas
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.cursor = 'pointer';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';

  root.appendChild(outWrapper);
  outWrapper.appendChild(inWrapper);
  outWrapper.appendChild(logo);
  outWrapper.appendChild(tip);
  inWrapper.appendChild(canvas);

  return {
    container: canvas,
    tip,
  };
}
