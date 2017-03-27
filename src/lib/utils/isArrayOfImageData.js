import isArray from 'lodash/isArray';

export default function isArrayOfImageData(arr) {
  return isArray(arr) && arr.every(data => data instanceof ImageData);
}
