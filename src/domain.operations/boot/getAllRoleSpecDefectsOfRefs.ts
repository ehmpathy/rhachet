import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { getOneRoleBootSpecOrDefectFromRef } from '@src/domain.operations/role/getOneRoleBootSpecOrDefectFromRef';

/**
 * .what = the `spec-unparsed` defect of each role whose `boot.yml` will not parse
 * .why = a focus receipt written before any render (`rhx init --roles x::flow`) must still know
 *        which roles boot refs-only, so it never claims a focus the boot will not apply. the
 *        read is the render's own lenient spec read, so both name the same specs
 *
 * .note = a role with no `boot.yml` yields no defect
 */
export const getAllRoleSpecDefectsOfRefs = (input: {
  refs: RoleLinkRef[];
  repoPath: string;
}): RoleContentDefect[] =>
  input.refs.flatMap((ref) => {
    const { defect } = getOneRoleBootSpecOrDefectFromRef({
      ref,
      repoPath: input.repoPath,
    });
    return defect ? [defect] : [];
  });
