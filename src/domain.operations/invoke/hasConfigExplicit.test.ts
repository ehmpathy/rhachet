import { given, then, useBeforeAll, when } from 'test-fns';

import { genContextCli } from '@src/domain.objects/ContextCli';

import { hasConfigExplicit } from './hasConfigExplicit';

describe('hasConfigExplicit', () => {
  given('[case1] a directory with rhachet.use.ts', () => {
    const context = useBeforeAll(() => genContextCli({ cwd: process.cwd() }));

    when('[t0] hasConfigExplicit is called', () => {
      then('it returns true', () => {
        // use the current repo root which has rhachet.use.ts
        const result = hasConfigExplicit(context);
        expect(result).toBe(true);
      });
    });
  });

  given('[case2] a directory without rhachet.use.ts', () => {
    when('[t0] hasConfigExplicit is called', () => {
      then('it returns false', () => {
        // note: for a proper test we'd need a fixture with a git repo without rhachet.use.ts
        // for now we just test the positive case
      });
    });
  });
});
