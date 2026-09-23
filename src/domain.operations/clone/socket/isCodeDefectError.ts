/**
 * .what = is this thrown value a JS-defect class — a code bug, never a runtime/transport fault?
 * .why = the fault-catch paths on the say hot path (the write queue's dequeue catch, the probe's
 *   or-blind degrade) must part a GENUINE code defect from an expected runtime fault. a JS built-in
 *   defect class — TypeError, RangeError, ReferenceError, SyntaxError — is a programmer error: it
 *   signals a bug in our own code (a bad deref, an out-of-range index, an undefined symbol, a parse
 *   fault), never a socket hiccup or a pty write errno. so it must surface LOUD (rethrown where a
 *   rethrow is safe, or traced as a defect where V15 forbids a rethrow) rather than fold into the
 *   mildest server-fault slug (`rule.forbid.failhide`). one owner of the classification, so both
 *   catch sites read the same predicate rather than each spell out the four classes (r002-i010-n2/n3)
 * .note = a `MalfunctionError` / `ConstraintError` (helpful-errors) is NOT a code defect — those are
 *   the deliberate, classed faults a transport path mints, so they are excluded and left to degrade
 */
export const isCodeDefectError = (error: unknown): boolean =>
  error instanceof TypeError ||
  error instanceof RangeError ||
  error instanceof ReferenceError ||
  error instanceof SyntaxError;
