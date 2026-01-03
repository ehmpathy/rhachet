import { BadRequestError } from 'helpful-errors';

import type { RoleInitExecutable } from '@src/domain.objects/RoleInitExecutable';

import { discoverInitExecutables } from './discoverInitExecutables';

/**
 * .what = finds exactly one init executable by slug, with optional repo/role filters
 * .why = ensures unambiguous init resolution before execution
 */
export const findUniqueInitExecutable = (input: {
  slugRepo?: string;
  slugRole?: string;
  slugInit: string;
}): RoleInitExecutable => {
  // discover inits with filters
  const matches = discoverInitExecutables({
    slugRepo: input.slugRepo,
    slugRole: input.slugRole,
    slugInit: input.slugInit,
  });

  // handle no matches
  if (matches.length === 0) {
    const filters = [
      input.slugRepo ? `--repo ${input.slugRepo}` : null,
      input.slugRole ? `--role ${input.slugRole}` : null,
    ]
      .filter(Boolean)
      .join(' ');

    const hint = filters
      ? `no init "${input.slugInit}" found with ${filters}`
      : `no init "${input.slugInit}" found in any linked role`;

    // discover all available inits to show suggestions
    const allInits = discoverInitExecutables({
      slugRepo: input.slugRepo,
      slugRole: input.slugRole,
    });
    const suggestions =
      allInits.length > 0
        ? `\n\navailable inits:\n${allInits
            .slice(0, 5)
            .map((s) => `  - ${s.slug} (repo=${s.slugRepo} role=${s.slugRole})`)
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
      .map((m) => `  - repo=${m.slugRepo} role=${m.slugRole}`)
      .join('\n');

    BadRequestError.throw(
      `multiple inits found for "${input.slugInit}":\n${matchList}\n\nuse --repo and/or --role to disambiguate`,
      { input, matches },
    );
  }

  // return unique match
  return matches[0]!;
};
