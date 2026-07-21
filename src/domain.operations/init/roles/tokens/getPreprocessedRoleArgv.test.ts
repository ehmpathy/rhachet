import { given, then, when } from 'test-fns';

import {
  getPreprocessedRoleArgv,
  INCREMENTAL_REMOVE_SENTINEL,
} from './getPreprocessedRoleArgv';

describe('getPreprocessedRoleArgv', () => {
  given('[case1] args with a `-role` remove token', () => {
    when('[t0] preprocessed', () => {
      then('rewrites the lead dash to the sentinel', () => {
        const out = getPreprocessedRoleArgv({
          args: ['init', '--roles', '+architect', '-reviewer'],
        });
        expect(out).toEqual([
          'init',
          '--roles',
          '+architect',
          `${INCREMENTAL_REMOVE_SENTINEL}reviewer`,
        ]);
      });
    });
  });

  given('[case2] args with an absolute role list', () => {
    when('[t0] preprocessed', () => {
      then('passes bare tokens through unchanged (e16)', () => {
        const out = getPreprocessedRoleArgv({
          args: ['init', '--roles', 'mechanic', 'behaver'],
        });
        expect(out).toEqual(['init', '--roles', 'mechanic', 'behaver']);
      });
    });
  });

  given('[case3] a `--roles` list followed by another flag', () => {
    when('[t0] preprocessed', () => {
      then('stops rewrite at the next --flag', () => {
        const out = getPreprocessedRoleArgv({
          args: ['init', '--roles', '-reviewer', '--hooks'],
        });
        expect(out).toEqual([
          'init',
          '--roles',
          `${INCREMENTAL_REMOVE_SENTINEL}reviewer`,
          '--hooks',
        ]);
      });
    });
  });

  given('[case4] a dash-like token NOT after --roles', () => {
    when('[t0] preprocessed', () => {
      then('leaves it untouched', () => {
        const out = getPreprocessedRoleArgv({
          args: ['init', '--mode', 'upsert'],
        });
        expect(out).toEqual(['init', '--mode', 'upsert']);
      });
    });
  });
});
