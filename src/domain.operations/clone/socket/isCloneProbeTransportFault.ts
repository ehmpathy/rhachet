import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { CloneWireCorruptionError } from './CloneWireCorruptionError';

/**
 * .what = whether an error is a transport fault the probe path mints — the allowlist of
 *   faults a probe may degrade to probe-blind
 * .why = a probe degrades a socket hiccup, never a defect. the probe path mints exactly
 *   these transport faults, so the degrade is reserved for them and every other error is
 *   thrown up (`rule.forbid.failhide`):
 *   - `CloneSocketGoneError` (a `ConstraintError`) — no listener: the path absent, or refused
 *   - `ConstraintError` — the connect timed out, or faulted another way (`connectToClone`)
 *   - `MalfunctionError` — the reply timed out, or the socket faulted mid-read
 *     (`getCloneInputState`)
 *
 * .note = a `CloneWireCorruptionError` extends `MalfunctionError`, yet it is a protocol defect,
 *   never a transport fault, so it is excluded here by name
 */
export const isCloneProbeTransportFault = (input: {
  error: unknown;
}): boolean => {
  if (input.error instanceof CloneWireCorruptionError) return false;
  return (
    input.error instanceof ConstraintError ||
    input.error instanceof MalfunctionError
  );
};
