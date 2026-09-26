import { ConstraintError } from 'helpful-errors';

import type { BrainDirBootFailure } from '@src/domain.operations/boot/BrainDirBootRender';

/**
 * .what = the exit code a brain dir sync owes, from its failures
 * .why = init, upgrade and roles link each exit by one rule (rule.require.exit-code-semantics):
 *        a failure only the human can fix is a constraint; any other is a malfunction
 *
 * .note = 0 when none failed · 2 when every cause is a ConstraintError · 1 otherwise
 */
export const asExitCodeForBrainDirSyncFailures = (input: {
  failures: BrainDirBootFailure[];
}): 0 | 1 | 2 => {
  if (input.failures.length === 0) return 0;
  const isEveryCauseConstraint = input.failures.every(
    (failure) => failure.cause instanceof ConstraintError,
  );
  return isEveryCauseConstraint ? 2 : 1;
};
