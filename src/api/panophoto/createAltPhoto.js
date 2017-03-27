import { applyStyle } from 'lib/dom';

// TODO: Use default photo if url is not provided
export default function createAltPhoto(url) {
  const altPhoto = new Image();

  // Attributes for altPhoto
  altPhoto.src = url;
  altPhoto.style.width = 'auto';
  altPhoto.style.height = '100%';
  altPhoto.style.position = 'absolute';
  altPhoto.style.left = '50%';
  altPhoto.style.top = '0';
  altPhoto.style.display = 'none';
  applyStyle(altPhoto, 'transform', 'translate(-50%, 0)');
  // States and methods for altPhoto
  altPhoto.isShown = false;
  altPhoto.show = () => {
    if (!altPhoto.isShown) {
      altPhoto.style.display = 'block';
      altPhoto.isShown = true;
    }
  };
  altPhoto.hide = () => {
    if (altPhoto.isShown) {
      altPhoto.style.display = 'none';
      altPhoto.isShown = false;
    }
  };

  return altPhoto;
}
