import { ConstraintError } from 'helpful-errors';

/**
 * .what = a clone socket with no listener behind it — the path is absent (ENOENT) or the
 *   connect was refused (ECONNREFUSED), so the clone that owned it is gone
 * .why =
 *   - a gone socket never self-heals, unlike a slow reply or a mid-read hiccup. the say observe
 *     loop must tell the two apart: it stops at once on a gone socket, and a `/exit` whose socket
 *     then closes is the clone that ended as asked — the `exited` verdict, never a probe fault
 *   - it extends ConstraintError only to be DISTINGUISHABLE at a catch site, by `instanceof` and
 *     with no message match. it keeps the leaf's owner and exit code, and the message a caller
 *     already reads (rule.forbid.helpful-error-parents — a reach down, never up)
 */
export class CloneSocketGoneError extends ConstraintError {}
