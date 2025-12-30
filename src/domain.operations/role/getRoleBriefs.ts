import glob from 'fast-glob';
import { BadRequestError } from 'helpful-errors';
import type { Artifact } from 'rhachet-artifact';
import { type GitFile, genArtifactGitFile } from 'rhachet-artifact-git';

import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = finds and returns briefs from a linked role directory as lazy-loadable artifacts
 * .why = enables role composition by allowing procedures to programmatically access briefs
 *
 * .note = this procedure looks into `.agent/*` directories for linked roles.
 *         if you just wrote a brief in the repo the role is defined in,
 *         you must run `npm run build && npx rhachet roles link` before it can be used.
 */
export const getRoleBriefs = async (input: {
  by: {
    role: { name: string };
    repo?: { name: string };
    briefs: { name?: string[]; glob?: string };
  };
}): Promise<Artifact<typeof GitFile>[]> => {
  // resolve agent directory
  const dirAgent = resolve(process.cwd(), '.agent');
  if (!existsSync(dirAgent))
    throw new BadRequestError(
      'no .agent directory found. did you forget to `npx rhachet roles link`?',
    );

  // scan for repo directories
  const dirsRepo = readdirSync(dirAgent)
    .filter((d) => d.startsWith('repo='))
    .map((d) => ({ slug: d.replace('repo=', ''), path: resolve(dirAgent, d) }));

  // find matching roles
  interface RoleLinked {
    slugRepo: string;
    slugRole: string;
    pathRole: string;
    pathBriefs: string;
  }
  const rolesMatching: RoleLinked[] = [];
  for (const dirRepo of dirsRepo) {
    // filter by repo if specified
    if (input.by.repo?.name && dirRepo.slug !== input.by.repo.name) continue;

    // scan for role directories matching the requested name
    const dirsRole = readdirSync(dirRepo.path)
      .filter((d) => d.startsWith('role='))
      .filter((d) => d.replace('role=', '') === input.by.role.name);

    // collect matching roles
    for (const dirRole of dirsRole) {
      const pathRole = resolve(dirRepo.path, dirRole);
      rolesMatching.push({
        slugRepo: dirRepo.slug,
        slugRole: input.by.role.name,
        pathRole,
        pathBriefs: resolve(pathRole, 'briefs'),
      });
    }
  }

  // reject if no matching role found
  if (rolesMatching.length === 0)
    throw new BadRequestError(
      `role "${input.by.role.name}" not found in .agent/ directory. did you forget to \`npx rhachet roles link --role ${input.by.role.name}\`?`,
    );

  // reject if multiple roles match without disambiguation
  if (rolesMatching.length > 1) {
    const locations = rolesMatching
      .map((r) => `  - repo=${r.slugRepo}`)
      .join('\n');
    throw new BadRequestError(
      `multiple roles found with name "${input.by.role.name}":\n${locations}\n\nuse by.repo.name to disambiguate`,
    );
  }

  // extract the single matching role
  const roleLinked = rolesMatching[0]!;

  // reject if briefs directory doesn't exist
  if (!existsSync(roleLinked.pathBriefs))
    throw new BadRequestError(
      `briefs directory not found for role "${roleLinked.slugRole}" in repo="${roleLinked.slugRepo}". ` +
        `did you forget to \`npx rhachet roles link --role ${roleLinked.slugRole}\`? ` +
        `(if you just wrote a brief, run: npm run build && npx rhachet roles link)`,
    );

  // match briefs by name or glob
  const pathsBrief: string[] = [];
  if (input.by.briefs.name?.length) {
    // exact name matching
    for (const name of input.by.briefs.name) {
      const pathsMatching = await glob(`**/${name}*`, {
        cwd: roleLinked.pathBriefs,
        absolute: true,
        onlyFiles: true,
      });
      if (pathsMatching.length === 0)
        throw new BadRequestError(
          `brief "${name}" not found in role "${roleLinked.slugRole}" (repo="${roleLinked.slugRepo}")`,
        );
      pathsBrief.push(...pathsMatching);
    }
  } else if (input.by.briefs.glob) {
    // glob pattern matching
    const pathsMatching = await glob(input.by.briefs.glob, {
      cwd: roleLinked.pathBriefs,
      absolute: true,
      onlyFiles: true,
    });
    pathsBrief.push(...pathsMatching);
  }

  // dedupe and create artifacts
  const pathsUnique = [...new Set(pathsBrief)];
  return pathsUnique.map((uri) => genArtifactGitFile({ uri }));
};
