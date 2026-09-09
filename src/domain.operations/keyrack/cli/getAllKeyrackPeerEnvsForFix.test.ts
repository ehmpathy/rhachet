import { given, then, when } from 'test-fns';

import { getAllKeyrackPeerEnvsForFix } from './getAllKeyrackPeerEnvsForFix';

describe('getAllKeyrackPeerEnvsForFix', () => {
  given('[case1] a rack whose keys span three envs', () => {
    const keys = [
      { env: 'test' },
      { env: 'prep' },
      { env: 'prep' },
      { env: 'prod' },
    ];

    when('[t0] the asked env is one of them', () => {
      then('the asked env is excluded, and the peers are deduped', () => {
        expect(
          getAllKeyrackPeerEnvsForFix({ keys, env: 'prep' }).sort(),
        ).toEqual(['prod', 'test']);
      });
    });

    when('[t1] the asked env holds no key at all', () => {
      then('every env the rack holds is offered', () => {
        expect(
          getAllKeyrackPeerEnvsForFix({ keys, env: 'camp' }).sort(),
        ).toEqual(['prep', 'prod', 'test']);
      });
    });
  });

  given('[case2] a rack that also holds a sudo key', () => {
    // ⚠️ .why = the carve-out is DESIGN, not incidental. a sudo key is unlocked only by an
    //        explicit `--env sudo --key <name>` and is never swept — so to advertise it as a
    //        place to look would send a human toward a narrow that cannot serve them
    const keys = [{ env: 'test' }, { env: 'sudo' }];

    when('[t0] the peers are read', () => {
      then('sudo is excluded, though the rack holds it', () => {
        expect(getAllKeyrackPeerEnvsForFix({ keys, env: 'prep' })).toEqual([
          'test',
        ]);
      });
    });

    when('[t1] sudo is the env ASKED for', () => {
      then('it is excluded by both rules at once, and neither errs', () => {
        expect(getAllKeyrackPeerEnvsForFix({ keys, env: 'sudo' })).toEqual([
          'test',
        ]);
      });
    });
  });

  given('[case3] a rack that holds only the asked env', () => {
    when('[t0] the peers are read', () => {
      then('the answer is empty — there is nowhere else to point', () => {
        expect(
          getAllKeyrackPeerEnvsForFix({
            keys: [{ env: 'prep' }, { env: 'prep' }],
            env: 'prep',
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case4] a rack that holds only sudo keys', () => {
    // ⚠️ .why = the row that keeps the carve-out honest. a naive "exclude the asked env"
    //        would answer `['sudo']` here, and the render would tell a human to
    //        `try --env sudo` — a narrow that sweeps not one key, so the hint would send
    //        them to a second empty rack (`rule.require.errors-name-the-fix`)
    when('[t0] the peers are read', () => {
      then('the answer is empty, never a sudo suggestion', () => {
        expect(
          getAllKeyrackPeerEnvsForFix({
            keys: [{ env: 'sudo' }],
            env: 'prep',
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case5] an empty rack', () => {
    when('[t0] the peers are read', () => {
      then('the answer is empty, and no throw', () => {
        expect(getAllKeyrackPeerEnvsForFix({ keys: [], env: 'prep' })).toEqual(
          [],
        );
      });
    });
  });
});
