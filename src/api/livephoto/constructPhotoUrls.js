import range from 'lodash/range';

export default function constructPhotoUrls(mediaId, content, quality, isCDNDisabled) {
  const {
    cdnUrl,
    storeUrl,
    count,
    shardingKey,
  } = content;
  const storeRoot = isCDNDisabled ? storeUrl : cdnUrl;

  return range(0, count).map((idx) => (
    `${storeRoot}${shardingKey}/media/${mediaId}/live/${quality}/${idx}.jpg`
  ));
}
