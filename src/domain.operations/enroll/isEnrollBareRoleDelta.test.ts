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

  given('[case3] a focused delta of a linked role', () => {
    when('[t0] the token is `+mechanic::flow`', () => {
      then('it reads as a delta, matched by its role', () => {
        expect(
          isEnrollBareRoleDelta({ token: '+mechanic::flow', rolesLinked }),
        ).toEqual(true);
      });
    });

    when('[t1] the token is `-mechanic::flow`', () => {
      then(
        'it reads as a delta, so the parser refuses it by name (P12)',
        () => {
          expect(
            isEnrollBareRoleDelta({ token: '-mechanic::flow', rolesLinked }),
          ).toEqual(true);
        },
      );
    });

    when(
      '[t2] the token is the repo-qualified `+ehmpathy/mechanic::flow`',
      () => {
        then('it reads as a delta', () => {
          expect(
            isEnrollBareRoleDelta({
              token: '+ehmpathy/mechanic::flow',
              rolesLinked,
            }),
          ).toEqual(true);
        });
      },
    );

    when(
      '[t2.b] the token is the one-colon typo `+mechanic:flow` (P14)',
      () => {
        then(
          'it reads as a delta, so the parser refuses it rather than the brain receive it as text',
          () => {
            expect(
              isEnrollBareRoleDelta({ token: '+mechanic:flow', rolesLinked }),
            ).toEqual(true);
          },
        );
      },
    );

    when('[t3] the token focuses a role not linked, `+nope::flow`', () => {
      then('it is not a delta', () => {
        expect(
          isEnrollBareRoleDelta({ token: '+nope::flow', rolesLinked }),
        ).toEqual(false);
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
