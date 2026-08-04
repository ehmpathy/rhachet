import { ConstraintError } from 'helpful-errors';

/**
 * .what = cast the unlock batch's omitted keys into the process exit code the CLI should set
 * .why = the grove chains `unlock && start-app`, so a silent exit 0 with an absent credential
 *        would let the app start credential-less. the SPECIFIC code follows exit-code-semantics
 *        on the cause: a purely caller-fixable batch (every errored cause a ConstraintError — a
 *        grant/region/identity to fix) exits 2 so a retry-loop fixes config, not a blind retry;
 *        any server/transient fault (a MalfunctionError or an unclassed cause) exits 1. a batch
 *        with no errored key returns null → the CLI leaves the exit code untouched (exit 0).
 *        extracted from the unlock orchestrator so it reads as narrative
 *        (rule.forbid.inline-decode-friction)
 */
export const asKeyrackUnlockExitCode = (input: {
  omitted: {
    reason: 'absent' | 'lost' | 'remote' | 'errored';
    cause?: unknown;
  }[];
}): 2 | 1 | null => {
  // only an isolated live fault (reason 'errored') drives a non-zero exit; absent/lost/remote are
  // benign omissions (a key not registered), so they leave the exit code at 0
  const erroredCauses = input.omitted
    .filter((o) => o.reason === 'errored')
    .map((o) => o.cause);
  if (!erroredCauses.length) return null;

  // every errored cause caller-fixable (a ConstraintError) → exit 2 (fix config, then retry);
  // any server/transient fault → exit 1
  return erroredCauses.every((cause) => cause instanceof ConstraintError)
    ? 2
    : 1;
};
