import { given, then, when } from 'test-fns';

import { getPreprocessedRoleArgv } from './getPreprocessedRoleArgv';
import { getRoleDeltaTokens } from './getRoleDeltaTokens';

/**
 * .what = unit tests for the shared `--roles` tokenizer
 * .why = both forms (space + comma) MUST collapse to an identical token list,
 *        and the sentinel MUST always decode back to a natural `-role`
 */
describe('getRoleDeltaTokens', () => {
  given('[case1] space-separated raw tokens (variadic form)', () => {
    when('[t0] flattened', () => {
      then('passes each natural token through, trimmed', () => {
        expect(
          getRoleDeltaTokens({ raw: ['+architect', '-reviewer', 'mechanic'] }),
        ).toEqual(['+architect', '-reviewer', 'mechanic']);
      });
    });
  });

  given('[case2] a single comma-joined token (single-string form)', () => {
    when('[t0] flattened', () => {
      then('splits on commas into the same list', () => {
        expect(
          getRoleDeltaTokens({ raw: ['+architect,-reviewer,mechanic'] }),
        ).toEqual(['+architect', '-reviewer', 'mechanic']);
      });
    });
  });

  given('[case3] a single whitespace-joined token (quoted form)', () => {
    when('[t0] flattened', () => {
      then('splits on whitespace into the same list', () => {
        expect(getRoleDeltaTokens({ raw: ['-driver +architect'] })).toEqual([
          '-driver',
          '+architect',
        ]);
      });
    });
  });

  given('[case4] both forms yield the identical token list', () => {
    when('[t0] space form vs comma form', () => {
      then('are equal', () => {
        const space = getRoleDeltaTokens({ raw: ['-driver', '+architect'] });
        const comma = getRoleDeltaTokens({ raw: ['-driver,+architect'] });
        expect(space).toEqual(comma);
        expect(space).toEqual(['-driver', '+architect']);
      });
    });
  });

  given(
    '[case5] sentinel-encoded lead-dash token (post getPreprocessedRoleArgv)',
    () => {
      when('[t0] a space-form encoded argv is flattened', () => {
        then('decodes the sentinel back to `-role`', () => {
          // simulate what invoke.ts produces for `--roles -driver +architect`
          const encoded = getPreprocessedRoleArgv({
            args: ['--roles', '-driver', '+architect'],
          }).slice(1); // drop the lead '--roles'
          expect(getRoleDeltaTokens({ raw: encoded })).toEqual([
            '-driver',
            '+architect',
          ]);
        });
      });

      when('[t1] a comma-form encoded argv is flattened', () => {
        then('decodes then splits, interior dashes intact', () => {
          // `--roles -a,-b` → invoke.ts encodes only the token lead dash
          const encoded = getPreprocessedRoleArgv({
            args: ['--roles', '-a,-b'],
          }).slice(1);
          expect(getRoleDeltaTokens({ raw: encoded })).toEqual(['-a', '-b']);
        });
      });
    },
  );

  given('[case6] messy whitespace and empty fragments', () => {
    when('[t0] flattened', () => {
      then('trims and drops empties', () => {
        expect(
          getRoleDeltaTokens({ raw: ['  +architect , , -reviewer '] }),
        ).toEqual(['+architect', '-reviewer']);
      });
    });

    when('[t1] a wholly empty value', () => {
      then('yields an empty list', () => {
        expect(getRoleDeltaTokens({ raw: [''] })).toEqual([]);
      });
    });
  });
});
