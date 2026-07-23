import { given, then, when } from 'test-fns';

import { isRolesFlag } from './isRolesFlag';

describe('isRolesFlag', () => {
  given('[case1] the long `--roles` flag', () => {
    when('[t0] checked', () => {
      then('is recognized as the roles flag', () => {
        expect(isRolesFlag({ token: '--roles' })).toEqual(true);
      });
    });
  });

  given('[case2] the short `-r` alias', () => {
    when('[t0] checked', () => {
      then('is recognized as the roles flag', () => {
        expect(isRolesFlag({ token: '-r' })).toEqual(true);
      });
    });
  });

  given('[case3] the joined `--roles=mechanic` form', () => {
    when('[t0] checked', () => {
      then('is NOT a bare flag token (handled separately by consumers)', () => {
        expect(isRolesFlag({ token: '--roles=mechanic' })).toEqual(false);
      });
    });
  });

  given('[case4] an unrelated token', () => {
    when('[t0] checked', () => {
      then('is not the roles flag', () => {
        expect(isRolesFlag({ token: '--hooks' })).toEqual(false);
        expect(isRolesFlag({ token: 'mechanic' })).toEqual(false);
        expect(isRolesFlag({ token: '-driver' })).toEqual(false);
      });
    });
  });
});
