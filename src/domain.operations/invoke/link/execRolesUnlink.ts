import type { ContextCli } from '@src/domain.objects/ContextCli';

import { execRoleUnlink } from './execRoleUnlink';

/**
 * .what = unlinks each { repo, role } target and returns the ones actually present
 * .why = keeps the incremental orchestrator narrative — the "unlink each, keep the
 *        removed" decode lives here, not inline in setIncrementalRoles
 *
 * .note = execRoleUnlink is idempotent ({ status: 'absent' } for a no-op target);
 *   an absent target drops out of the returned set, so the summary reports only
 *   the real removals
 */
export const execRolesUnlink = (
  input: { targets: { repo: string; role: string }[] },
  context: ContextCli,
): { repo: string; role: string }[] =>
  input.targets.flatMap((target) =>
    execRoleUnlink({ repo: target.repo, role: target.role }, context).status ===
    'removed'
      ? [target]
      : [],
  );
