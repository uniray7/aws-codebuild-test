import { applyStyle } from 'lib/dom';
import config from 'config';

export default function createBrand() {
  const brand = new Image();

  // Attributes for brand
  brand.src = `${config.staticRoot}/assets/brand-pano.svg`;
  brand.width = 70;
  brand.height = 70;
  brand.style.position = 'absolute';
  brand.style.left = '50%';
  brand.style.bottom = '50%';
  brand.style.visibility = 'hidden';
  brand.style.opacity = '0';
  applyStyle(brand, 'pointer-events', 'none');
  applyStyle(brand, 'transform', 'translate(-50%, 50%)');
  // States and method for brand
  brand.isShown = false;
  brand.show = () => {
    if (!brand.isShown) {
      // TODO: Restart brand animation at show
      applyStyle(brand, 'transition', 'visibility 0s linear 1.5s, opacity 1.5s linear');
      brand.style.visibility = 'visible';
      brand.style.opacity = '1';
      brand.isShown = true;
    }
  };
  brand.hide = () => {
    if (brand.isShown) {
      applyStyle(brand, 'transition', 'visibility 0s linear .5s, opacity .5s linear');
      brand.style.visibility = 'hidden';
      brand.style.opacity = '0';
      brand.isShown = false;
    }
  };

  return brand;
}
