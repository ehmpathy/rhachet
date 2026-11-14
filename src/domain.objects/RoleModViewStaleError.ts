import { ConstraintError } from 'helpful-errors';

/**
 * .what = the refusal of a modded view that lags its mod or its role
 * .why = a sweep must tell a stale view (a render fixes it) from a refused mod (a human fixes
 *        it) by type, never by the words of the message
 *
 * .note = a ConstraintError, so it keeps the caller-must-fix owner and exit 2
 *   (`rule.forbid.helpful-error-parents` sanctions a leaf subclass)
 */
export class RoleModViewStaleError extends ConstraintError {}
