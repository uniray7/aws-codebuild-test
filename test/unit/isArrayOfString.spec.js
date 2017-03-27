import isArrayOfString from 'lib/utils/isArrayOfString';

describe('isArrayOfString()', () => {
  it('should return true if input is array of string', () => {
    [
      [],
      ['STR'],
      ['str0', 'str1'],
      ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's10'],
    ].forEach((arr) => expect(isArrayOfString(arr)).to.be.true);
  });

  it('should return false if input is array of string', () => {
    [
      undefined,
      null,
      () => {},
      100,
      'STR',
      [3],
      ['STR', 3],
      [0.0, 'str'],
    ].forEach((arr) => expect(isArrayOfString(arr)).to.be.false);
  });
});
