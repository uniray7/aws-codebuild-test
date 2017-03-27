import isMobile from 'lib/devices/isMobile';

import {
  inMobile,
  mockMobile,
} from 'test/helpers';

describe('isMobile()', () => {
  it('should return true on mobile device and return false on desktop', () => {
    if (process.env.PHANTOM) {
      expect(isMobile()).to.be.false;

      // Mock up mobile device
      const mockMobileDevice = mockMobile();
      expect(isMobile()).to.be.true;
      mockMobileDevice.restore();
    } else {
      if (inMobile()) {
        expect(isMobile()).to.be.true;
      } else {
        expect(isMobile()).to.be.false;
      }
    }
  });
});
