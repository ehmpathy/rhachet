import { given, then, when } from 'test-fns';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * .what = the installed dependencies hold the peer reviewer defaults the wisher set
 * .why = `inventory.of=requirements.case=5`: a review lane that names no `--brain` reviews with
 *   `openrouter/deepseek/flash`, whose spec holds a 1M window. both now ship upstream, so a
 *   dependency bump that reverts either goes red here; this reads the installed code
 *
 * .note = rhachet selects this brain but never calls it. the real-call contract test belongs to
 *   `rhachet-brains-openrouter`, the package that makes the call (wisher, 2026-10-07)
 */
describe('installed dependencies — the default peer reviewer brain', () => {
  const asPackageDir = (input: { name: string }): string =>
    dirname(require.resolve(`${input.name}/package.json`));

  given('[case1] the installed rhachet-roles-bhrain', () => {
    const dir = asPackageDir({ name: 'rhachet-roles-bhrain' });

    when('[t0] its review default is read', () => {
      then('`rhx review` and `review.by` default to openrouter/deepseek/flash', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        // .note = 0.42 renamed the constant `BRAIN_DEFAULT_OF_REVIEW` and moved it under
        //   `domain.operations/brain/`; its value is unchanged
        const constant = require(
          join(
            dir,
            'dist',
            'domain.operations',
            'brain',
            'BRAIN_DEFAULT_OF_REVIEW.js',
          ),
        ) as { BRAIN_DEFAULT_OF_REVIEW: string };
        expect(constant.BRAIN_DEFAULT_OF_REVIEW).toEqual(
          'openrouter/deepseek/flash',
        );
      });

      then('both review contracts read that one constant', () => {
        for (const file of ['review.js', 'review.by.js']) {
          const source = readFileSync(
            join(dir, 'dist', 'contract', 'cli', file),
            'utf-8',
          );
          expect(source).toContain('BRAIN_DEFAULT_OF_REVIEW');
        }
      });
    });
  });

  given('[case2] the installed rhachet-brains-openrouter', () => {
    when('[t0] its tier specs are read', () => {
      then('every tier declares a 1M token window', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const config = require(
          join(
            asPackageDir({ name: 'rhachet-brains-openrouter' }),
            'dist',
            'domain.operations',
            'atom',
            'BrainAtom.config.js',
          ),
        ) as {
          SPEC_ESTIMATE_BY_TIER: Record<
            string,
            { gain: { size: { context: { tokens: number } } } }
          >;
        };
        const windows = Object.values(config.SPEC_ESTIMATE_BY_TIER).map(
          (spec) => spec.gain.size.context.tokens,
        );
        expect(windows.length).toBeGreaterThan(0);
        expect(new Set(windows)).toEqual(new Set([1_000_000]));
      });
    });
  });
});
