import { MalfunctionError } from 'helpful-errors';

/**
 * .what = a get-reply the clone socket could not parse as our own protocol — a corrupt json
 *   line, a `capable` payload with a malformed state, or an unknown `probe` value
 * .why =
 *   - the get wire is OUR protocol on both ends, so a reply that does not fit it is a defect
 *     to fix, never a caller fault or a transient hiccup — it stays a `MalfunctionError`
 *     (server fixes it, exit 1), so it routes exactly as its leaf does
 *   - it extends MalfunctionError only to be DISTINGUISHABLE at a catch site: the
 *     `getCloneInputStateOrBlind` degrade must mask a transient TRANSPORT fault (a socket
 *     hiccup, a timeout) as probe-blind, but must NOT mask real wire corruption — else a
 *     protocol regression hides behind the mildest `feed-not-live` slug forever
 *     (rule.forbid.failhide). an `instanceof` check tells the two apart with no message match
 *   - a subclass that extends a leaf is acceptable: it reaches DOWN, so it inherits the owner
 *     and exit code the leaf decides (rule.forbid.helpful-error-parents — the forbidden move
 *     is a reach UP to an ownerless parent, never a reach down)
 */
export class CloneWireCorruptionError extends MalfunctionError {}
