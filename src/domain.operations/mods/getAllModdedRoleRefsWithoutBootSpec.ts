import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { asRepoSlugKind } from '@src/domain.operations/role/asRepoSlugKind';
import { getAllLinkedRoleRefs } from '@src/domain.operations/role/getAllLinkedRoleRefs';

import { isRoleModdedWithoutBootSpec } from './isRoleModdedWithoutBootSpec';

/**
 * .what = each linked package role whose view is modded and whose dir holds no boot.yml
 * .why = the cost sweep lists boot specs, so a role with no boot.yml has no row to mark; the
 *        sweep names these apart, so `rhx roles cost --all` shows every edited role (usecase 4)
 *
 * .note = a view record marks a modded view, refused or not; the boot check names which
 */
export const getAllModdedRoleRefsWithoutBootSpec = (
  _input: Record<string, never>,
  context: ContextCli,
): RoleLinkRef[] =>
  getAllLinkedRoleRefs({}, context)
    .filter((ref) => asRepoSlugKind({ slug: ref.repo }) === 'package')
    .filter((ref) => isRoleModdedWithoutBootSpec({ cwd: context.cwd, ref }));
