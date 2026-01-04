import { BadRequestError } from 'helpful-errors';

import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = finds exactly one role directory by slug, with optional repo filter
 * .why = ensures unambiguous role resolution before cost analysis or other operations
 */
export const findUniqueRoleDir = (input: {
  slugRepo?: string;
  slugRole: string;
  ifPresent?: boolean;
}): { roleDir: string; slugRepo: string; slugRole: string } | null => {
  const agentDir = resolve(process.cwd(), '.agent');

  // normalize "this"/"THIS" to ".this"
  const slugRepoNormalized = (() => {
    const normalized = input.slugRepo?.trim().toLowerCase();
    if (normalized === 'this' || normalized === '.this') return '.this';
    return input.slugRepo;
  })();

  // collect matches
  const matches: { roleDir: string; slugRepo: string; slugRole: string }[] = [];

  // skip if .agent directory does not exist
  if (!existsSync(agentDir)) {
    if (input.ifPresent) return null;
    BadRequestError.throw(
      `.agent/ directory not found. run \`npx rhachet roles link\` first`,
    );
  }

  // discover repo directories
  const repoEntries = readdirSync(agentDir).filter((entry) =>
    entry.startsWith('repo='),
  );

  for (const repoEntry of repoEntries) {
    const slugRepo = repoEntry.replace('repo=', '');

    // filter by slugRepo if specified
    if (slugRepoNormalized && slugRepo !== slugRepoNormalized) continue;

    const repoDir = resolve(agentDir, repoEntry);

    // discover role directories
    const roleEntries = readdirSync(repoDir).filter((entry) =>
      entry.startsWith('role='),
    );

    for (const roleEntry of roleEntries) {
      const slugRole = roleEntry.replace('role=', '');

      // filter by slugRole if specified
      if (slugRole !== input.slugRole) continue;

      const roleDir = resolve(repoDir, roleEntry);
      matches.push({ roleDir, slugRepo, slugRole });
    }
  }

  // handle no matches
  if (matches.length === 0) {
    if (input.ifPresent) return null;

    const hint = slugRepoNormalized
      ? `no role "${input.slugRole}" found in .agent/repo=${slugRepoNormalized}/`
      : `no role "${input.slugRole}" found in .agent/`;

    const tip = `\n\ntip: did you \`npx rhachet roles link --role ${input.slugRole}\` first?`;

    BadRequestError.throw(`${hint}${tip}`, { input });
  }

  // handle multiple matches
  if (matches.length > 1) {
    const matchList = matches.map((m) => `  - ${m.slugRepo}`).join('\n');

    BadRequestError.throw(
      `multiple repos have role "${input.slugRole}":\n${matchList}\n\nuse --repo to disambiguate`,
      { input, matches },
    );
  }

  // return unique match
  return matches[0]!;
};
