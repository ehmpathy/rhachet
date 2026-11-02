import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleDelta } from '@src/domain.objects/RoleDelta';
import { getAllRolesAtFocusAlwaysShed } from '@src/domain.operations/boot/getAllRolesAtFocusAlwaysShed';
import { getRoleDeltasOfKind } from '@src/domain.operations/roles/deltas/getRoleDeltasOfKind';
import { asRepoAmbientRoleFocusChanges } from '@src/domain.operations/roles/focus/ambient/asRepoAmbientRoleFocusChanges';
import { setRepoAmbientRoleFoci } from '@src/domain.operations/roles/focus/ambient/setRepoAmbientRoleFoci';
import { asRoleFocusReceiptLines } from '@src/domain.operations/roles/focus/asRoleFocusReceiptLines';
import { asRoleRefsAtFocus } from '@src/domain.operations/roles/focus/asRoleRefsAtFocus';

import { getAllLinkedRoleRefs } from './link/getAllLinkedRoleRefs';

/**
 * .what = record an `rhx init --roles` delta's foci, and the receipt lines that name what changed
 * .why = a link carries no focus, so init records it beside the repo actor; the receipt names
 *        each focus the delta narrowed, moved, or widened, and each `always` a focus shed, so
 *        no change is silent
 *
 * .note = runs after the links; every focus was refused or admitted before the first write
 *         (`assertInitRoleFociDeclared`)
 * .note = `rolesLinkedBefore` names the roles held before this init, so a role it links for
 *         the first time reads as an addition, never a focus change
 */
export const setInitRoleFoci = async (
  input: { deltas: RoleDelta[]; rolesLinkedBefore: string[] },
  context: ContextCli,
): Promise<{ lines: string[] }> => {
  // record the foci beside the repo actor
  const recorded = await setRepoAmbientRoleFoci({
    repoPath: context.gitroot,
    deltas: input.deltas,
  });

  // name each focus change, and each `always` a focus shed
  const refsLinkedAfter = getAllLinkedRoleRefs({}, context);
  const lines = asRoleFocusReceiptLines({
    changes: asRepoAmbientRoleFocusChanges({
      rolesLinkedBefore: input.rolesLinkedBefore,
      rolesLinkedAfter: refsLinkedAfter.map((ref) => ref.role),
      fociPrior: recorded.fociPrior,
      foci: recorded.foci,
      additions: getRoleDeltasOfKind({
        deltas: input.deltas,
        kind: 'addition',
      }),
    }),
    alwaysShed: getAllRolesAtFocusAlwaysShed({
      refs: asRoleRefsAtFocus({ refs: refsLinkedAfter, foci: recorded.foci }),
      repoPath: context.gitroot,
    }),
  });
  return { lines };
};
