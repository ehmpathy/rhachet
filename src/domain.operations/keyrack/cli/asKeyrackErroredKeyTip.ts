import { ConstraintError, HelpfulError } from 'helpful-errors';

/**
 * .what = cast an isolated unlock fault (its cause + the env) into a clean errored-key tip
 * .why = the G5 per-key fault-isolation render must show a caught fault legibly, not dump the
 *        raw HelpfulError class + metadata json. a ConstraintError is caller-fixable, so its own
 *        hint IS the fix (no "retry"); a transient (non-ConstraintError) fault gets the retry
 *        suffix. extracted from the unlock orchestrator so the loop reads as narrative
 *        (rule.forbid.inline-decode-friction)
 */
export const asKeyrackErroredKeyTip = (input: {
  cause: unknown;
  env: string | null;
}): string => {
  // strip the "✋ ClassName: " prefix a HelpfulError bakes into .message, after it redacts its
  // metadata + cause, so the tip reads as a bare human message (not a raw class dump)
  const rawMessage =
    input.cause instanceof HelpfulError
      ? input.cause.redact(['metadata', 'cause']).message
      : input.cause instanceof Error
        ? input.cause.message
        : String(input.cause);

  // strip the class-name prefix off the ACTUAL class identity (constructor.name — e.g.
  // "ConstraintError"), not a regex that guesses the class ends in "Error". HelpfulError bakes
  // "<glyph> <ClassName>: " at the front of .message (e.g. "✋ ConstraintError: "), so key the
  // strip on the real class token. only strip when the token sits at the very start (after an
  // optional glyph run like "✋ "), so a mid-message occurrence of the token is never cut;
  // otherwise keep the message verbatim
  const className =
    input.cause instanceof Error ? input.cause.constructor.name : null;
  const markerAt = className ? rawMessage.indexOf(`${className}: `) : -1;
  const bareMessage =
    className !== null &&
    markerAt >= 0 &&
    /^[^A-Za-z]*$/.test(rawMessage.slice(0, markerAt))
      ? rawMessage.slice(markerAt + `${className}: `.length)
      : rawMessage;

  // read the caller-relevant hint the HelpfulError carries; typeof narrows unknown to string
  const hintValue =
    input.cause instanceof HelpfulError ? input.cause.metadata?.hint : null;
  const hint = typeof hintValue === 'string' ? hintValue : null;

  // a caller-fixable ConstraintError → its hint is the fix (never a "retry": a bad input does
  // not fix itself on re-run). a transient MalfunctionError/unknown → a retry may help
  const suffix =
    input.cause instanceof ConstraintError
      ? hint
        ? ` — fix: ${hint}`
        : ''
      : ` — retry: rhx keyrack unlock --env ${input.env ?? ''}`;

  return `${bareMessage}${suffix}`.trim();
};
