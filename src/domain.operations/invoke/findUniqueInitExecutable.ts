import { BadRequestError } from 'helpful-errors';

import type { RoleInitExecutable } from '@src/domain.objects/RoleInitExecutable';

import { discoverInitExecutables } from './discoverInitExecutables';

/**
 * .what = finds exactly one init executable by slug, with optional repo/role filters
 * .why = ensures unambiguous init resolution before execution
 */
export const findUniqueInitExecutable = (input: {
  repoSlug?: string;
  roleSlug?: string;
  initSlug: string;
}): RoleInitExecutable => {
  // discover inits with filters
  const matches = discoverInitExecutables({
    repoSlug: input.repoSlug,
    roleSlug: input.roleSlug,
    initSlug: input.initSlug,
  });

  // handle no matches
  if (matches.length === 0) {
    const filters = [
      input.repoSlug ? `--repo ${input.repoSlug}` : null,
      input.roleSlug ? `--role ${input.roleSlug}` : null,
    ]
      .filter(Boolean)
      .join(' ');

    const hint = filters
      ? `no init "${input.initSlug}" found with ${filters}`
      : `no init "${input.initSlug}" found in any linked role`;

    // discover all available inits to show suggestions
    const allInits = discoverInitExecutables({
      repoSlug: input.repoSlug,
      roleSlug: input.roleSlug,
    });
    const suggestions =
      allInits.length > 0
        ? `\n\navailable inits:\n${allInits
            .slice(0, 5)
            .map((s) => `  - ${s.slug} (repo=${s.repoSlug} role=${s.roleSlug})`)
            .join(
              '\n',
            )}${allInits.length > 5 ? `\n  ... and ${allInits.length - 5} more` : ''}`
        : '';

    const tip = `\n\ntip: did you \`npx rhachet roles link\` the --role this init comes from?`;

    BadRequestError.throw(`${hint}${suggestions}${tip}`, { input });
  }

  // handle multiple matches
  if (matches.length > 1) {
    const matchList = matches
      .map((m) => `  - repo=${m.repoSlug} role=${m.roleSlug}`)
      .join('\n');

    BadRequestError.throw(
      `multiple inits found for "${input.initSlug}":\n${matchList}\n\nuse --repo and/or --role to disambiguate`,
      { input, matches },
    );
  }

  // return unique match
  return matches[0]!;
};
