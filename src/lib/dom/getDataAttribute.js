function deserialize(value) {
  if (value === 'true') {
    return true;
  } else if (value === 'false') {
    return false;
  } else if (value === 'null') {
    return null;
  } else if (value === 'undefined') {
    return undefined;
  } else if (!isNaN(parseFloat(value)) && isFinite(value)) {
    return parseFloat(value);
  }

  return value;
}

export default function getDataAttribute(el, name) {
  return deserialize(el.getAttribute(`data-${name}`));
}

