import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asRoleModFaultLabel } from './asRoleModFaultLabel';

const TEST_CASES = [
  {
    description: 'a stray entry is named by its path under the mods dir',
    given: {
      role: '.mods',
      error: new ConstraintError(
        'a mods dir holds an entry that names no role',
        { entry: 'readme.md' },
      ),
    },
    expect: { output: '.agent/repo=.mods/readme.md' },
  },
  {
    description: 'an unreadable mods path is named by the mods dir',
    given: {
      role: '.mods',
      error: new ConstraintError('the mods path cannot be read', {
        modsDir: '/repo/.agent/repo=.mods',
        errno: 'ENOTDIR',
      }),
    },
    expect: { output: '.agent/repo=.mods' },
  },
  {
    description: 'a mods dir with no errno is named by its role',
    given: {
      role: 'surfer',
      error: new ConstraintError('a mod is refused', {
        modsDir: '/repo/.agent/repo=.mods',
      }),
    },
    expect: { output: 'role=surfer' },
  },
  {
    description: 'a fault of a role is named by its role',
    given: {
      role: 'surfer',
      error: new ConstraintError('a mod is refused', { fix: 'x' }),
    },
    expect: { output: 'role=surfer' },
  },
  {
    description: 'a bare error is named by its role',
    given: { role: 'surfer', error: new Error('raw') },
    expect: { output: 'role=surfer' },
  },
];

describe('asRoleModFaultLabel', () => {
  given('[case1] each kind of mod fault', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then('the label read is as expected', () => {
          expect(asRoleModFaultLabel(thisCase.given)).toEqual(
            thisCase.expect.output,
          );
        });
      }),
    );
  });
});
