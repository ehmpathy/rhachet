import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';
import type { discoverBrainPackages } from '@src/domain.operations/brains/discoverBrainPackages';

import { resolveBrainsToPackages } from './resolveBrainsToPackages';

/**
 * 🚨 ZERO mocks. this file used to `jest.mock` the discovery module, which reads
 *   `package.json` off disk — a remote boundary replaced by a mock, so no row could observe
 *   a real read and the module registry was rewritten for the whole file
 *   (`rule.forbid.unit.remote-boundaries`). it is injected as a typed fake now.
 */

const context = new ContextCli({ cwd: '/test', gitroot: '/test' });

/**
 * .what = a discovery stand-in that answers one scripted install set, and records whether it
 *   was ever asked
 *
 * ⚠️ typed as `typeof discoverBrainPackages`, never a hand-rolled shape — a stand-in the
 *   producer cannot emit would let this suite pass against a contract that does not exist
 */
const genDiscoverThatAnswers = (
  installed: string[],
): { discover: typeof discoverBrainPackages; getCalls: () => number } => {
  // .note = deliberate mutation — a local count, never escapes this closure
  let calls = 0;
  return {
    discover: async () => {
      calls += 1;
      return installed;
    },
    getCalls: () => calls,
  };
};

describe('resolveBrainsToPackages', () => {
  given('[case1] empty specs array', () => {
    when('[t0] resolveBrainsToPackages is called', () => {
      then('returns empty array without discovery', async () => {
        const fake = genDiscoverThatAnswers(['rhachet-brains-anthropic']);
        const result = await resolveBrainsToPackages({ specs: [] }, context, {
          discover: fake.discover,
        });
        expect(result).toEqual([]);
        expect(fake.getCalls()).toEqual(0);
      });
    });
  });

  given('[case2] wildcard spec with installed brain packages', () => {
    when('[t0] resolveBrainsToPackages is called with *', () => {
      then('expands via discovery and returns all brain packages', async () => {
        const result = await resolveBrainsToPackages(
          { specs: ['*'] },
          context,
          {
            discover: genDiscoverThatAnswers([
              'rhachet-brains-anthropic',
              'rhachet-brains-opencode',
            ]).discover,
          },
        );
        expect(result).toContain('rhachet-brains-anthropic');
        expect(result).toContain('rhachet-brains-opencode');
        expect(result).toHaveLength(2);
      });
    });
  });

  given('[case3] explicit slug spec', () => {
    when('[t0] resolveBrainsToPackages is called with slug', () => {
      then('resolves slug to full package name', async () => {
        const result = await resolveBrainsToPackages(
          { specs: ['anthropic'] },
          context,
          {
            discover: genDiscoverThatAnswers(['rhachet-brains-anthropic'])
              .discover,
          },
        );
        expect(result).toEqual(['rhachet-brains-anthropic']);
      });
    });
  });

  given('[case4] full package name spec', () => {
    when(
      '[t0] resolveBrainsToPackages is called with full package name',
      () => {
        then('passes through unchanged', async () => {
          const result = await resolveBrainsToPackages(
            { specs: ['rhachet-brains-anthropic'] },
            context,
            {
              discover: genDiscoverThatAnswers(['rhachet-brains-anthropic'])
                .discover,
            },
          );
          expect(result).toEqual(['rhachet-brains-anthropic']);
        });
      },
    );
  });

  given('[case5] brain package not installed', () => {
    when('[t0] resolveBrainsToPackages is called with absent package', () => {
      then(
        'throws ConstraintError, whose hint names no package manager',
        async () => {
          // ⚠️ the CLASS is asserted, never merely the message — the class is what
          //   sets exit 2 and names the caller as the one who amends, so a test that
          //   reads the message alone stays green through a revert to a parent class
          //   (`rule.forbid.helpful-error-parents`, `rule.require.exit-code-semantics`)
          const error = await getError(
            resolveBrainsToPackages({ specs: ['nonexistent'] }, context, {
              discover: genDiscoverThatAnswers(['rhachet-brains-anthropic'])
                .discover,
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('brain package not installed');

          // ⚠️ the hint must name no package-manager command: this row fires on every
          //   host, and the repo may be on npm, pnpm, yarn, or bun
          //   (`rule.forbid.host-specific-cures-in-hints`)
          expect((error as ConstraintError).metadata?.hint).not.toMatch(
            /\b(npm|pnpm|yarn|bun)\b/,
          );
        },
      );
    });
  });

  given('[case6] duplicate specs', () => {
    when('[t0] resolveBrainsToPackages is called with duplicates', () => {
      then('deduplicates packages', async () => {
        const result = await resolveBrainsToPackages(
          { specs: ['anthropic', 'anthropic', 'rhachet-brains-anthropic'] },
          context,
          {
            discover: genDiscoverThatAnswers(['rhachet-brains-anthropic'])
              .discover,
          },
        );
        expect(result).toEqual(['rhachet-brains-anthropic']);
      });
    });
  });
});
