import { asRepoSlugKind } from '@src/domain.operations/role/asRepoSlugKind';
import { asPathRelPosix } from '@src/infra/filesystem/asPathRelPosix';

/**
 * .what = whether a boot spec path sits under the repo's mods, `.agent/repo=.mods/`
 * .why = a mod's boot.yml is no role spec; the reserved-slug predicate (`asRepoSlugKind`) is the
 *        one owner of which `repo=` slug is the mods, so no scanner restates the literal
 *
 * .note = read from the path relative to the cwd, so a cwd that itself sits under a `.agent`
 *   dir does not read as a mod
 */
export const isBootSpecPathOfRoleMod = (input: {
  cwd: string;
  path: string;
}): boolean => {
  const pathRel = asPathRelPosix({ from: input.cwd, to: input.path });
  const slugRepoDir = pathRel.match(/^\.agent\/(repo=[^/]+)\//)?.[1];
  if (!slugRepoDir) return false;
  return asRepoSlugKind({ slug: slugRepoDir }) === 'mods';
};
