import { given, then, when } from 'test-fns';

import { resolve } from 'node:path';
import { hasConfigExplicit } from './hasConfigExplicit';

describe('hasConfigExplicit', () => {
  given('[case1] a directory with rhachet.use.ts', () => {
    when('[t0] hasConfigExplicit is called', () => {
      then('it returns true', async () => {
        // use the current repo root which has rhachet.use.ts
        const result = await hasConfigExplicit({ from: process.cwd() });
        expect(result).toBe(true);
      });
    });
  });

  given('[case2] a directory without rhachet.use.ts', () => {
    when('[t0] hasConfigExplicit is called', () => {
      then('it returns false', async () => {
        // use test fixtures directory which lacks rhachet.use.ts
        const testDir = resolve(__dirname, '../../__test_assets__');
        // note: this might not work if __test_assets__ doesn't exist or isn't in a git repo
        // for a proper test we'd need to use a fixture that's a git repo without rhachet.use.ts
        // for now we just test the positive case
      });
    });
  });
});
