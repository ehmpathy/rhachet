import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asRoleModFaultsHookReadout } from './asRoleModFaultsHookReadout';

const INVOCATION = 'roles cost --all --when hook.onStop';

describe('asRoleModFaultsHookReadout', () => {
  given('[case1] one refused mod with a fix', () => {
    when('[t0] the hold is rendered', () => {
      const lines = asRoleModFaultsHookReadout({
        invocation: INVOCATION,
        faults: [
          {
            role: 'surfer',
            error: new ConstraintError(
              'the mod of role=surfer is refused: its not matches no file',
              {
                fix: 'point the not at a held path, or delete the line',
              },
            ),
          },
        ],
      });

      then(
        'it names the class in the singular, the fault, its fix, and what clears the hold',
        () => {
          expect(lines[0]).toEqual(`🧢 ${INVOCATION}`);
          expect(lines[1]).toContain(
            '✋ ConstraintError: 1 mod fault, held at the first stop of each turn until cured',
          );
          expect(lines.join('\n')).toContain('└─ role=surfer');
          expect(lines.join('\n')).toContain(
            '└─ fix = point the not at a held path, or delete the line',
          );
          expect(lines).toContain(
            '   └─ ask your human before you delete a mod',
          );
        },
      );

      then('the hold matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case2] a stray with a fix, and a corrupt record with none', () => {
    when('[t0] the hold is rendered', () => {
      const lines = asRoleModFaultsHookReadout({
        invocation: INVOCATION,
        faults: [
          {
            role: '.mods',
            error: new ConstraintError(
              'a mods dir holds an entry that names no role',
              {
                entry: 'readme.md',
                fix: 'move it out of .agent/repo=.mods/',
              },
            ),
          },
          {
            role: 'surfer',
            error: new MalfunctionError(
              'the modded view record is unreadable',
              { path: '/x' },
            ),
          },
        ],
      });

      then(
        'it names the class in the plural, and each fault by where it lives',
        () => {
          expect(lines[1]).toContain('2 mod faults, held');
          expect(lines.join('\n')).toContain('├─ .agent/repo=.mods/readme.md');
          expect(lines.join('\n')).toContain('└─ role=surfer');
        },
      );

      then('a fault with no fix closes on its problem', () => {
        expect(lines.join('\n')).toContain(
          '└─ 💥 MalfunctionError: the modded view record is unreadable',
        );
      });

      then('the hold matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given(
    '[case3] faults met out of role order, as an fs walk may meet them',
    () => {
      const asFault = (role: string) => ({
        role,
        error: new MalfunctionError('the modded view record is unreadable', {
          role,
        }),
      });

      when('[t0] the hold is rendered from either order', () => {
        const linesWalkA = asRoleModFaultsHookReadout({
          invocation: INVOCATION,
          faults: [asFault('surfer'), asFault('lifeguard')],
        });
        const linesWalkB = asRoleModFaultsHookReadout({
          invocation: INVOCATION,
          faults: [asFault('lifeguard'), asFault('surfer')],
        });

        then(
          'both orders render the same hold, in code-point order of the role',
          () => {
            expect(linesWalkA).toEqual(linesWalkB);
            const text = linesWalkA.join('\n');
            expect(text.indexOf('role=lifeguard')).toBeLessThan(
              text.indexOf('role=surfer'),
            );
          },
        );
      });
    },
  );

  given(
    '[case4] three stacked faults: a stray, a refused mod, and a corrupt record',
    () => {
      when('[t0] the hold is rendered', () => {
        const lines = asRoleModFaultsHookReadout({
          invocation: INVOCATION,
          faults: [
            {
              role: '.mods',
              error: new ConstraintError(
                'a mods dir holds an entry that names no role',
                {
                  entry: 'readme.md',
                  fix: 'move it out of .agent/repo=.mods/',
                },
              ),
            },
            {
              role: 'surfer',
              error: new ConstraintError(
                'the mod of role=surfer is refused: its not matches no file',
                {
                  fix: 'point the not at a held path, or delete the line',
                },
              ),
            },
            {
              role: 'lifeguard',
              error: new MalfunctionError(
                'the modded view record is unreadable',
                { path: '/x' },
              ),
            },
          ],
        });

        then(
          'one header counts 3, with one branch per fault, and one footer',
          () => {
            expect(lines[1]).toContain('3 mod faults, held');
            const text = lines.join('\n');
            expect(text).toContain('.agent/repo=.mods/readme.md');
            expect(text).toContain('role=surfer');
            expect(text).toContain('role=lifeguard');
            expect(
              lines.filter((line) => line.includes('ask your human')),
            ).toHaveLength(1);
          },
        );

        then('the hold matches its snapshot', () => {
          expect(lines.join('\n')).toMatchSnapshot();
        });
      });
    },
  );
});
