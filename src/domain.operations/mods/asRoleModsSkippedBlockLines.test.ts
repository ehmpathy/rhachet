import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asRoleModsSkippedBlockLines } from './asRoleModsSkippedBlockLines';

const FAULT_STRAY = {
  role: '.mods',
  error: new ConstraintError('a mods dir holds an entry that names no role', {
    entry: 'readme.md',
    fix: 'rename .agent/repo=.mods/readme.md to .agent/repo=.mods/role=<slug>, or move it out of .agent/repo=.mods/',
  }),
};
const FAULT_UNPLACED = {
  role: 'ghost',
  error: new ConstraintError(
    'the mod of role=ghost names a role no package links',
    {
      fix: 'link the role, or delete .agent/repo=.mods/role=ghost',
    },
  ),
};

describe('asRoleModsSkippedBlockLines', () => {
  given('[case1] no fault no role carries', () => {
    when('[t0] the block is rendered', () => {
      then('it renders naught, so a clean repo pays no bytes', () => {
        expect(asRoleModsSkippedBlockLines({ faults: [] })).toEqual([]);
      });
    });
  });

  given('[case2] one stray', () => {
    when('[t0] the block is rendered', () => {
      const lines = asRoleModsSkippedBlockLines({ faults: [FAULT_STRAY] });

      then(
        'it counts one fault, names it by its path, and gives its fix',
        () => {
          expect(lines[0]).toEqual('<mods.skipped>');
          expect(lines[1]).toContain('1 mod fault no role carries');
          expect(lines.join('\n')).toContain(
            '- .agent/repo=.mods/readme.md — ✋ ConstraintError:',
          );
          expect(lines.join('\n')).toContain(
            '  fix = rename .agent/repo=.mods/readme.md',
          );
        },
      );

      then('the block matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case3] a stray and a mod of no linked role', () => {
    when('[t0] the block is rendered', () => {
      const lines = asRoleModsSkippedBlockLines({
        faults: [FAULT_STRAY, FAULT_UNPLACED],
      });

      then('it counts two faults, each named once', () => {
        expect(lines[1]).toContain('2 mod faults no role carries');
        expect(lines.filter((line) => line.startsWith('- '))).toHaveLength(2);
      });

      then('the block matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
