/* eslint-disable no-param-reassign */

const prefixList = [
  'webkit',
  'Moz',
  'ms',
  'O',
];

// Apply cross-browser style to a dom object
export default function applyStyle(domObj, property, value) {
  prefixList.forEach((prefix) => {
    // property with vender prefix.
    // Example: transform with webkit prefix => webkitTransform
    const prefixProperty = `${prefix}${property.charAt(0).toUpperCase()}${property.slice(1)}`;
    domObj.style[prefixProperty] = value;
  });
  domObj.style[property] = value;
}

