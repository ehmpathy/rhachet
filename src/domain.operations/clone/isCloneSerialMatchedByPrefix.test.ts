import { given, then, when } from 'test-fns';

import { isCloneSerialMatchedByPrefix } from './isCloneSerialMatchedByPrefix';

describe('isCloneSerialMatchedByPrefix', () => {
  const serial = '49b41f88-1c2d-4e5f-8a9b-0c1d2e3f4a5b';

  given('[case1] a prefix that spans a hyphen', () => {
    when('[t0] matched', () => {
      then('the hyphens are ignored', () => {
        expect(
          isCloneSerialMatchedByPrefix({ serial, prefix: '49b41f881c2d' }),
        ).toEqual(true);
      });
    });
  });

  given('[case2] an uppercase prefix', () => {
    when('[t0] matched', () => {
      then('the case is ignored', () => {
        expect(
          isCloneSerialMatchedByPrefix({ serial, prefix: '49B41F' }),
        ).toEqual(true);
      });
    });
  });

  given('[case3] a prefix of a different serial', () => {
    when('[t0] matched', () => {
      then('it does not match', () => {
        expect(
          isCloneSerialMatchedByPrefix({ serial, prefix: 'beef' }),
        ).toEqual(false);
      });
    });
  });
});
