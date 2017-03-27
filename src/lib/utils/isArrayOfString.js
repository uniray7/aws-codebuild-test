import isArray from 'lodash/isArray';
import isString from 'lodash/isString';

export default function isArrayOfString(arr) {
  return isArray(arr) && arr.every(isString);
}
