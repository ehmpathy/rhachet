import { ConstraintError } from 'helpful-errors';

/**
 * .what = the decrypt refusals the `age` tool emits, which arrive as a bare `Error`
 * .why = `age` is a FOREIGN binary (and, on the js path, a foreign library). it does not
 *        know our error classes, so its refusals reach us with no class to read — and
 *        `vaultAdapterOsSecure` hands its credential decrypt straight to it, unwrapped.
 *        this list is therefore the ONE place a message string is trusted, and it is
 *        bounded to that one foreign tool
 *
 * .note = exported so a test can clamp it. a phrase list that only lives inside an `if`
 *         is a contract nobody can point at
 *
 * .note = ⚠️ WHAT BREAKS IF `age` REWORDS, stated rather than left to be discovered. the
 *         compiler cannot link this string to the tool that emits it, so a reword does not
 *         fail the build — it fails LOUD at runtime instead, and that direction is the
 *         design. an unmatched phrase falls through to a rethrow, so `fill` halts with the
 *         raw `age` error rather than absorbs it. the failure mode is a fill that stops on
 *         a key it should have skipped: noisy, legible, and fixed by one phrase added here.
 *         the reverse — a swallow — is what `rule.forbid.failhide` forbids, and it cannot
 *         happen from a reword, only from a phrase that is too BROAD. so keep them narrow
 * .note = the better fix lives one layer down and outside this wish's bound: were
 *         `vaultAdapterOsSecure` to wrap `age`'s refusals in a HelpfulError subclass, this
 *         clause could go by class like every other and the string would be deletable
 */
export const KEYRACK_FILL_PROBE_AGE_MISSES = [
  'no identity matched',
  'failed to decrypt',
] as const;

/**
 * .what = decides whether a fault raised by fill's UNLOCK PROBE is an expected miss
 * .why = `fill` unlocks only to ask "is this key already vaulted?". a miss is the normal
 *        answer, not a fault — so it must be absorbed, or fill could never provision the
 *        very key it was asked to. but a bare catch would absorb a DEFECT with the same
 *        silence, which is the failhide `rule.forbid.failhide` forbids
 *
 * .note = the allowlist is by ERROR CLASS first, never by a match on message text, so it
 *         cannot drift as error copy is reworded. ONE class names the whole caller-fixable
 *         family: `ConstraintError extends ConstraintError`, so the root covers it. an
 *         explicit `ConstraintError` clause beside the root reads as though the two were
 *         siblings, which invites a reader to believe a class could satisfy one and not
 *         the other. the family root says it once
 * .note = a MalfunctionError / MalfunctionError (exit 1) is a defect and is NOT a
 *         miss — it rethrows, and reaches the human (rule.require.exit-code-semantics)
 * .note = the message clause is the deliberate exception, not a second policy: it applies
 *         ONLY once the class clause has already declined, and ONLY to `age`'s own words.
 *         a phrase list of OUR OWN messages would be the drift hazard — this one cannot
 *         be fixed by a class, because the thrower is not ours
 */
export const isKeyrackFillProbeMiss = (input: { error: unknown }): boolean => {
  const error = input.error;

  // by class — this is the whole answer for every fault keyrack itself throws.
  // caller-fixable faults carry exit 2 and are misses (rule.require.exit-code-semantics)
  if (error instanceof ConstraintError) return true;

  // a non-Error carries no message, so the foreign clause below cannot apply to it either
  if (!(error instanceof Error)) return false;

  // by message — the foreign-tool escape hatch, and no clause beyond it
  return KEYRACK_FILL_PROBE_AGE_MISSES.some((phrase) =>
    error.message.includes(phrase),
  );
};
