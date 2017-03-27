import fetch from 'isomorphic-fetch';
import config from 'config';

const FETCH_ROOT = config.fetchRoot;

export default function getMedia(mediaId) {
  const url = `${FETCH_ROOT}/media/${mediaId}`;

  return fetch(url).then((res) => {
    if (res.status >= 400) {
      throw new Error(res);
    }
    return res.json();
  }).then((data) => {
    if (data && !data.error) {
      return data.result;
    }
    throw new Error(data.error);
  });
}
