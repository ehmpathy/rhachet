import { ConstraintError } from 'helpful-errors';

import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import { RoleModViewStaleError } from '@src/domain.objects/RoleModViewStaleError';
import { asRepoSlugKind } from '@src/domain.operations/role/asRepoSlugKind';
import { asRoleDir } from '@src/domain.operations/role/asRoleDir';
import { getAllLinkedRoleRefs } from '@src/domain.operations/role/getAllLinkedRoleRefs';

import { getOneRoleModForRoleDir } from './getOneRoleModForRoleDir';

/**
 * .what = each linked package role a boot would refuse for its mod: a stale view, or a refusal
 * .why = the cost sweep cannot price a role whose boot refuses, so its row drops; the sweep
 *        names these apart, so `rhx roles cost --all` still shows every edited role (usecase 4)
 *
 * .note = the boot's own check decides, never a second test that could disagree; its refusal
 *   is a RoleModViewStaleError for a lagged view, and any other ConstraintError for a refusal
 *   the render recorded
 */
export const getAllModdedRoleRefsUnbootable = (
  _input: Record<string, never>,
  context: ContextCli,
): { stale: RoleLinkRef[]; refused: RoleLinkRef[] } => {
  const verdicts = getAllLinkedRoleRefs({}, context)
    .filter((ref) => asRepoSlugKind({ slug: ref.repo }) === 'package')
    .map((ref) => ({
      ref,
      verdict: getOneRoleModBootVerdict({
        roleDir: asRoleDir({ cwd: context.cwd, ref }),
      }),
    }));
  return {
    stale: verdicts
      .filter((one) => one.verdict === 'stale')
      .map((one) => one.ref),
    refused: verdicts
      .filter((one) => one.verdict === 'refused')
      .map((one) => one.ref),
  };
};

/**
 * .what = whether a role dir boots, or why its mod stops it
 */
const getOneRoleModBootVerdict = (input: {
  roleDir: string;
}): 'boots' | 'stale' | 'refused' => {
  try {
    getOneRoleModForRoleDir({ roleDir: input.roleDir });
    return 'boots';
  } catch (error: unknown) {
    if (error instanceof RoleModViewStaleError) return 'stale';
    if (error instanceof ConstraintError) return 'refused';
    throw error;
  }
};
