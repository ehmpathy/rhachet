import { given, then, when } from 'test-fns';

import { asEnrollBareRoleDeltas } from './asEnrollBareRoleDeltas';

const rolesLinked = ['mechanic', 'driver', 'architect', 'reviewer'];

describe('asEnrollBareRoleDeltas', () => {
  given('[case1] a bare remove delta that names a linked role', () => {
    when('[t0] the passthrough is `-driver`', () => {
      then('it leaves the passthrough as a delta', () => {
        expect(
          asEnrollBareRoleDeltas({ passthrough: ['-driver'], rolesLinked }),
        ).toEqual({ deltas: ['-driver'], passthrough: [] });
      });
    });
  });

  given('[case2] bare deltas mixed with brain flags', () => {
    when('[t0] the passthrough is `-c -driver +architect -p hi`', () => {
      then('the deltas leave; the brain flags and their values stay', () => {
        expect(
          asEnrollBareRoleDeltas({
            passthrough: ['-c', '-driver', '+architect', '-p', 'hi'],
            rolesLinked,
          }),
        ).toEqual({
          deltas: ['-driver', '+architect'],
          passthrough: ['-c', '-p', 'hi'],
        });
      });
    });
  });

  given('[case3] a sigiled token that names no linked role', () => {
    when('[t0] the passthrough is `-drivr`', () => {
      then('it stays in the passthrough for the brain', () => {
        expect(
          asEnrollBareRoleDeltas({ passthrough: ['-drivr'], rolesLinked }),
        ).toEqual({ deltas: [], passthrough: ['-drivr'] });
      });
    });
  });

  given('[case4] a repo-qualified delta', () => {
    when('[t0] the passthrough is `-ehmpathy/reviewer`', () => {
      then('it reads as a delta', () => {
        expect(
          asEnrollBareRoleDeltas({
            passthrough: ['-ehmpathy/reviewer'],
            rolesLinked,
          }),
        ).toEqual({ deltas: ['-ehmpathy/reviewer'], passthrough: [] });
      });
    });
  });

  given('[case5] a long flag whose name matches a linked role', () => {
    when('[t0] the passthrough is `--driver`', () => {
      then('it stays a brain flag', () => {
        expect(
          asEnrollBareRoleDeltas({ passthrough: ['--driver'], rolesLinked }),
        ).toEqual({ deltas: [], passthrough: ['--driver'] });
      });
    });
  });

  given('[case7] a focused bare delta beside a brain flag', () => {
    when('[t0] the passthrough is `+mechanic::flow -c`', () => {
      then(
        'the focus leaves as a delta, never reaches the brain as prompt text',
        () => {
          expect(
            asEnrollBareRoleDeltas({
              passthrough: ['+mechanic::flow', '-c'],
              rolesLinked,
            }),
          ).toEqual({ deltas: ['+mechanic::flow'], passthrough: ['-c'] });
        },
      );
    });
  });

  given('[case6] an unsigiled role name', () => {
    when('[t0] the passthrough is `driver`', () => {
      then('it stays in the passthrough (a prompt word, not a delta)', () => {
        expect(
          asEnrollBareRoleDeltas({ passthrough: ['driver'], rolesLinked }),
        ).toEqual({ deltas: [], passthrough: ['driver'] });
      });
    });
  });
});
