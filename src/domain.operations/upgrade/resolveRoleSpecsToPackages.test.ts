import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';
import type { discoverRolePackages } from '@src/domain.operations/init/roles/packages/discoverRolePackages';

import { resolveRoleSpecsToPackages } from './resolveRoleSpecsToPackages';

/**
 * 🚨 ZERO mocks — the same seam, and the same reason, as
 *   `resolveBrainsToPackages.test.ts`: the discovery reads `package.json` off disk, so a
 *   `jest.mock` of it replaces a remote boundary rather than crosses it
 *   (`rule.forbid.unit.remote-boundaries`).
 */

const context = new ContextCli({ cwd: '/test', gitroot: '/test' });

/**
 * .what = a discovery stand-in that answers one scripted install set, and records whether it
 *   was ever asked
 *
 * ⚠️ typed as `typeof discoverRolePackages`, never a hand-rolled shape
 */
const genDiscoverThatAnswers = (
  installed: string[],
): { discover: typeof discoverRolePackages; getCalls: () => number } => {
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

/** .what = the one install set every row but `[case2]` runs against */
const discoverEhmpathy = (): typeof discoverRolePackages =>
  genDiscoverThatAnswers(['rhachet-roles-ehmpathy']).discover;

describe('resolveRoleSpecsToPackages', () => {
  given('[case1] empty specs array', () => {
    when('[t0] resolveRoleSpecsToPackages is called', () => {
      then('returns empty array without discovery', async () => {
        const fake = genDiscoverThatAnswers(['rhachet-roles-ehmpathy']);
        const result = await resolveRoleSpecsToPackages(
          { specs: [] },
          context,
          {
            discover: fake.discover,
          },
        );
        expect(result).toEqual([]);
        expect(fake.getCalls()).toEqual(0);
      });
    });
  });

  given('[case2] wildcard spec with installed role packages', () => {
    when('[t0] resolveRoleSpecsToPackages is called with *', () => {
      then('expands via discovery and returns all role packages', async () => {
        const result = await resolveRoleSpecsToPackages(
          { specs: ['*'] },
          context,
          {
            discover: genDiscoverThatAnswers([
              'rhachet-roles-ehmpathy',
              'rhachet-roles-bhuild',
            ]).discover,
          },
        );
        expect(result).toContain('rhachet-roles-ehmpathy');
        expect(result).toContain('rhachet-roles-bhuild');
        expect(result).toHaveLength(2);
      });
    });
  });

  given('[case3] explicit slug spec', () => {
    when('[t0] resolveRoleSpecsToPackages is called with slug', () => {
      then('resolves slug to full package name', async () => {
        const result = await resolveRoleSpecsToPackages(
          { specs: ['ehmpathy'] },
          context,
          { discover: discoverEhmpathy() },
        );
        expect(result).toEqual(['rhachet-roles-ehmpathy']);
      });
    });
  });

  given('[case4] full package name spec', () => {
    when(
      '[t0] resolveRoleSpecsToPackages is called with full package name',
      () => {
        then('passes through unchanged', async () => {
          const result = await resolveRoleSpecsToPackages(
            { specs: ['rhachet-roles-ehmpathy'] },
            context,
            { discover: discoverEhmpathy() },
          );
          expect(result).toEqual(['rhachet-roles-ehmpathy']);
        });
      },
    );
  });

  given('[case5] role package not installed', () => {
    when(
      '[t0] resolveRoleSpecsToPackages is called with absent package',
      () => {
        then(
          'throws ConstraintError, whose hint names no package manager',
          async () => {
            // ⚠️ the CLASS is asserted, never merely the message — the class is what
            //   sets exit 2 and names the caller as the one who amends, so a test that
            //   reads the message alone stays green through a revert to a parent class
            //   (`rule.forbid.helpful-error-parents`, `rule.require.exit-code-semantics`)
            const error = await getError(
              resolveRoleSpecsToPackages({ specs: ['nonexistent'] }, context, {
                discover: discoverEhmpathy(),
              }),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain('role package not installed');

            // ⚠️ the hint must name no package-manager command: this row fires on every
            //   host, and the repo may be on npm, pnpm, yarn, or bun
            //   (`rule.forbid.host-specific-cures-in-hints`)
            expect((error as ConstraintError).metadata?.hint).not.toMatch(
              /\b(npm|pnpm|yarn|bun)\b/,
            );
          },
        );
      },
    );
  });

  given('[case6] duplicate specs', () => {
    when('[t0] resolveRoleSpecsToPackages is called with duplicates', () => {
      then('deduplicates packages', async () => {
        const result = await resolveRoleSpecsToPackages(
          { specs: ['ehmpathy', 'ehmpathy', 'rhachet-roles-ehmpathy'] },
          context,
          { discover: discoverEhmpathy() },
        );
        expect(result).toEqual(['rhachet-roles-ehmpathy']);
      });
    });
  });

  given('[case7] role specifier with repo/role format', () => {
    when('[t0] resolveRoleSpecsToPackages is called with repo/role', () => {
      then('extracts repo and resolves to package name', async () => {
        const result = await resolveRoleSpecsToPackages(
          { specs: ['ehmpathy/mechanic'] },
          context,
          { discover: discoverEhmpathy() },
        );
        expect(result).toEqual(['rhachet-roles-ehmpathy']);
      });
    });

    when(
      '[t1] resolveRoleSpecsToPackages is called with full package/role',
      () => {
        then('extracts repo and resolves to package name', async () => {
          const result = await resolveRoleSpecsToPackages(
            { specs: ['rhachet-roles-ehmpathy/mechanic'] },
            context,
            { discover: discoverEhmpathy() },
          );
          expect(result).toEqual(['rhachet-roles-ehmpathy']);
        });
      },
    );
  });
});
