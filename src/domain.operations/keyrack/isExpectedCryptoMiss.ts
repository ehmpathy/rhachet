import { HelpfulError } from 'helpful-errors';

/**
 * .what = decide whether a caught key/crypto error is an expected per-attempt miss (swallow, skip this
 *         candidate) or a real, actionable failure that must fail loud (rethrow)
 * .why = the discovery + verify orchestrators try many candidate keys/identities. an expected miss —
 *        an unparseable key file, a wrong-identity decryption — surfaces as a bare/generic Error and is
 *        safe to skip. but EVERY rhachet-native error (a helpful-errors subclass: MalfunctionError for a
 *        broken crypto load, ConstraintError for "install age"/bad input) is intentional and actionable,
 *        so it MUST propagate — to swallow one is the e6 failhide rule.forbid.failhide forbids.
 *
 * .note = a denylist (rethrow every value that is a HelpfulError) is robust to any helpful-errors
 *         subclass a call site may throw, present or future — so a new actionable error can never
 *         silently regress into a skipped candidate. a bare `Error` (or a non-Error throw) is the only
 *         value treated as an expected miss.
 */
export const isExpectedCryptoMiss = (error: unknown): boolean =>
  error instanceof Error && !(error instanceof HelpfulError);
