import range from 'lodash/range';

export default function constructPhotoUrls(
  mediaId,
  mediaObj,
  visibleWidth,
  visibleHeight,
  isCDNDisabled = false
) {
  const {
    cdnUrl,
    storeUrl,
    quality,
    shardingKey,
  } = mediaObj.content;
  const storeRoot = isCDNDisabled ? storeUrl : cdnUrl;
  // TODO: More rules to choose the best quality
  const selectedIdx = (Math.max(visibleWidth, visibleHeight) <= 300) ? quality.length - 1 : 0;
  const selectedQuality = quality[selectedIdx];

  return range(0, selectedQuality.tiles).map((idx) => (
    `${storeRoot}${shardingKey}/media/${mediaId}/pano/${selectedQuality.size}/${idx}.jpg`
  ));
}
