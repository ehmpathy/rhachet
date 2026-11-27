import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { getAllRoleModFaultsOfModsDir } from './getAllRoleModFaultsOfModsDir';

describe('getAllRoleModFaultsOfModsDir', () => {
  given('[case1] a sound mods dir with no stray', () => {
    when('[t0] its faults are read', () => {
      then('there are none', () => {
        expect(
          getAllRoleModFaultsOfModsDir({
            modsDir: '/repo/.agent/repo=.mods',
            fault: null,
            strays: [],
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case2] an unreadable mods path, and two strays', () => {
    const fault = new ConstraintError('the mods path cannot be read');

    when('[t0] its faults are read', () => {
      const faults = getAllRoleModFaultsOfModsDir({
        modsDir: '/repo/.agent/repo=.mods',
        fault,
        strays: ['readme.md', 'notes'],
      });

      then('the path fault leads, named for the mods dir itself', () => {
        expect(faults[0]).toEqual({ role: '.mods', error: fault });
      });

      then('each stray follows as its own fault, named by its entry', () => {
        expect(faults.slice(1).map((one) => one.role)).toEqual([
          'readme.md',
          'notes',
        ]);
        expect(faults[1]?.error).toBeInstanceOf(ConstraintError);
        expect(faults[1]?.error.message).toContain('names no role');
      });
    });
  });
});
