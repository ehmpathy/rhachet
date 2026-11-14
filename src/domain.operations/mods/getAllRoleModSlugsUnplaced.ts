import type { ContextCli } from '@src/domain.objects/ContextCli';
import { getAllLinkedRoleRefs } from '@src/domain.operations/role/getAllLinkedRoleRefs';
import { getAllRoleModEntries } from '@src/domain.operations/role/getAllRoleModEntries';

/**
 * .what = the slug of each mod dir that no linked role carries, and each entry of the mods dir
 *         that names no role
 * .why = such a mod finds no role to apply to, so no boot raises it and no roster row marks
 *        it; a report that walks only linked roles would never name it
 *
 * .note = the same test the render applies: a mod is placed where any linked role has its slug
 * .note = a stray entry is returned, never thrown: the report names it and exits 0, where the
 *   render refuses it
 */
export const getAllRoleModSlugsUnplaced = (
  _input: Record<string, never>,
  context: ContextCli,
): { slugsUnplaced: string[]; entriesStray: string[] } => {
  const { slugs, strays } = getAllRoleModEntries({ cwd: context.cwd });
  if (slugs.length === 0) return { slugsUnplaced: [], entriesStray: strays };
  const refsLinked = getAllLinkedRoleRefs({}, context);
  return {
    slugsUnplaced: slugs.filter(
      (slug) => !refsLinked.some((ref) => ref.role === slug),
    ),
    entriesStray: strays,
  };
};
