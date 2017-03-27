import isIframe from 'lib/devices/isIframe';

import { inIframe } from 'test/helpers';

describe('isIframe()', () => {
  it('should return true if in iframe and false if not', () => {
    if (inIframe()) {
      expect(isIframe()).to.be.true;
    } else {
      expect(isIframe()).to.be.false;
    }
  });
});
