import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asRoleModStrayEntryError } from './asRoleModStrayEntryError';
import { asRoleModViewsChangedReadout } from './asRoleModViewsChangedReadout';

describe('asRoleModViewsChangedReadout', () => {
  given('[case1] a render that changed no view', () => {
    when('[t0] the readout is rendered', () => {
      then('it is empty, so the render stays silent', () => {
        expect(
          asRoleModViewsChangedReadout({
            roles: [],
            reverted: [],
            unplaced: [],
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case2] a render that changed two views', () => {
    when('[t0] the readout is rendered', () => {
      const lines = asRoleModViewsChangedReadout({
        roles: ['surfer', 'lifeguard', 'surfer'],
        reverted: [],
        unplaced: [],
      });

      then('it names each role once, in order', () => {
        expect(lines.filter((line) => line.includes('role='))).toEqual([
          '   │  ├─ role=lifeguard',
          '   │  └─ role=surfer',
        ]);
      });

      then(
        'it says live clones keep their prior boot until re-enrolled',
        () => {
          expect(lines.at(-1)).toContain(
            'a live clone keeps the boot it read at session start; re-enroll it',
          );
        },
      );

      then('it matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case3] a mod refused before it found its role', () => {
    when('[t0] the readout is rendered', () => {
      const lines = asRoleModViewsChangedReadout({
        roles: [],
        reverted: [],
        unplaced: [
          {
            role: 'surfr',
            error: new ConstraintError('the mod names no linked role'),
          },
        ],
      });

      then('it names the mod and its refusal, since no boot will', () => {
        expect(lines).toEqual([
          '🧢 .agent/repo=.mods',
          '   └─ refused, with no linked role to carry it',
          '      └─ role=surfr — ✋ ConstraintError: the mod names no linked role',
        ]);
      });

      then('it matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given(
    '[case3.1] two mods refused before they found a role, one with a fix',
    () => {
      when('[t0] the readout is rendered', () => {
        const lines = asRoleModViewsChangedReadout({
          roles: [],
          reverted: [],
          unplaced: [
            {
              role: 'surfr',
              error: new ConstraintError('the mod names no linked role', {
                fix: 'rhx init --roles test/surfr, or delete the mod',
              }),
            },
            {
              role: 'divr',
              error: new ConstraintError('the mod names no linked role'),
            },
          ],
        });

        then(
          'each refusal carries its fix as a leaf, since no role can boot to print it',
          () => {
            expect(lines).toEqual([
              '🧢 .agent/repo=.mods',
              '   └─ refused, with no linked role to carry it',
              '      ├─ role=divr — ✋ ConstraintError: the mod names no linked role',
              '      └─ role=surfr — ✋ ConstraintError: the mod names no linked role',
              '         └─ fix = rhx init --roles test/surfr, or delete the mod',
            ]);
          },
        );
      });
    },
  );

  given(
    '[case3.2] unplaced mods whose slugs a host collation would reorder',
    () => {
      when('[t0] the readout is rendered', () => {
        const lines = asRoleModViewsChangedReadout({
          roles: [],
          reverted: [],
          unplaced: [
            { role: 'surfr', error: new ConstraintError('no linked role') },
            { role: 'Divr', error: new ConstraintError('no linked role') },
            { role: 'surf-r', error: new ConstraintError('no linked role') },
          ],
        });

        then(
          'they are listed in code-point order, the same on any host',
          () => {
            expect(lines.filter((line) => line.includes('role='))).toEqual([
              '      ├─ role=Divr — ✋ ConstraintError: no linked role',
              '      ├─ role=surf-r — ✋ ConstraintError: no linked role',
              '      └─ role=surfr — ✋ ConstraintError: no linked role',
            ]);
          },
        );
      });
    },
  );

  given('[case3.3] a stray entry of the mods dir, which names no role', () => {
    when('[t0] the readout is rendered', () => {
      const lines = asRoleModViewsChangedReadout({
        roles: [],
        reverted: [],
        unplaced: [
          {
            role: 'readme.md',
            error: asRoleModStrayEntryError({
              modsDir: '.agent/repo=.mods',
              entry: 'readme.md',
            }),
          },
        ],
      });

      then(
        'it names the stray by its path, never as a role, with its fix',
        () => {
          expect(lines).toEqual([
            '🧢 .agent/repo=.mods',
            '   └─ refused, with no linked role to carry it',
            '      └─ .agent/repo=.mods/readme.md — ✋ ConstraintError: a mods dir holds an entry that names no role',
            '         └─ fix = rename .agent/repo=.mods/readme.md to .agent/repo=.mods/role=<slug>, or move it out of .agent/repo=.mods/',
          ]);
        },
      );
    });
  });

  given('[case4] a render that returned a role to its published form', () => {
    when('[t0] the readout is rendered', () => {
      const lines = asRoleModViewsChangedReadout({
        roles: [],
        reverted: ['lifeguard'],
        unplaced: [],
      });

      then('it names the role, and tells live clones to re-enroll', () => {
        expect(lines).toEqual([
          '🧢 .agent/repo=.mods',
          '   ├─ returned to published, its mod gone',
          '   │  └─ role=lifeguard',
          '   └─ a live clone keeps the boot it read at session start; re-enroll it to pick up the change',
        ]);
      });

      then('it matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
