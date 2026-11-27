import { given, then, when } from 'test-fns';

import { asRoleModsDir } from './asRoleModsDir';

describe('asRoleModsDir', () => {
  given('[case1] a repo root', () => {
    when('[t0] its mods dir is asked for', () => {
      then('it is .agent/repo=.mods under the root', () => {
        expect(asRoleModsDir({ cwd: '/repo' })).toEqual(
          '/repo/.agent/repo=.mods',
        );
      });
    });
  });
});
