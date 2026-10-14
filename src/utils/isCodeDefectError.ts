const CODE_DEFECT_NAMES: ReadonlySet<string> = new Set([
  'TypeError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
]);

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
 * .note = the same allowlist bounds every per-actor collector (init's hook sync, the brain dir
 *   sweep, the delta re-derive): a classed or fs fault is collected into that actor's failure row,
 *   and a defect is rethrown, never folded into a row
 * .note = a `MalfunctionError` / `ConstraintError` (helpful-errors) is NOT a code defect — those are
 *   the deliberate, classed faults a transport path mints, so they are excluded and left to degrade
 * .note = the class is also read by its name, on any value the runtime brands as an error. a
 *   defect minted in another realm — node's own `path.join` or `appendFileSync` arg checks, seen
 *   from inside a vm context such as a jest sandbox — fails `instanceof TypeError` there, yet is
 *   the same bug
 */
export const isCodeDefectError = (input: { error: unknown }): boolean => {
  const { error } = input;
  if (
    error instanceof TypeError ||
    error instanceof RangeError ||
    error instanceof ReferenceError ||
    error instanceof SyntaxError
  )
    return true;
  if (Object.prototype.toString.call(error) !== '[object Error]') return false;
  return CODE_DEFECT_NAMES.has((error as Error).name);
};
