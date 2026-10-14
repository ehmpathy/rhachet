import { given, then, when } from 'test-fns';

import { INCREMENTAL_REMOVE_SENTINEL } from '../roles/deltas/getPreprocessedRoleArgv';
import { isEnrollBareRoleDelta } from './isEnrollBareRoleDelta';

const rolesLinked = ['mechanic', 'driver', 'architect', 'reviewer'];

describe('isEnrollBareRoleDelta', () => {
  given('[case1] a sentinel-encoded token (commander view)', () => {
    when('[t0] the token is the encoded `-driver`', () => {
      then('it decodes and reads as a delta', () => {
        expect(
          isEnrollBareRoleDelta({
            token: `${INCREMENTAL_REMOVE_SENTINEL}driver`,
            rolesLinked,
          }),
        ).toEqual(true);
      });
    });
  });

  given('[case2] a brain name in the positional slot', () => {
    when('[t0] the token is `claude`', () => {
      then('it is not a delta', () => {
        expect(isEnrollBareRoleDelta({ token: 'claude', rolesLinked })).toEqual(
          false,
        );
      });
    });
  });
});
