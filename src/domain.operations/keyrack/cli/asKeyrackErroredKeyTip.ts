import { ConstraintError, HelpfulError } from 'helpful-errors';

import { asKeyrackSlugParts } from '../asKeyrackSlugParts';

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

  /**
   * .what = the slug of the key that errored
   * .why = a retry re-runs THIS key, never the whole sweep. one errored row retried bare would
   *        re-read every key the sweep held, and the slug also names the org and env to retry at
   */
  slug: string;

  /**
   * .what = the manifest's default org, or null outside a repo
   * .why = a key under a non-default member (or `@all`) retried with no `--org` reads the default
   *        org's twin instead (case=8). the default is never spelled, so its render stays terse
   */
  orgDefault: string | null;

  /**
   * .what = the owner the unlock ran as, or null for the default owner
   * .why = a retry with no owner re-runs as the DEFAULT owner — for a robot owner, a human's rack
   */
  owner: string | null;
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
  // the retry names the one key, at its own org and env, as the owner the sweep ran as
  const { org, env, keyName } = asKeyrackSlugParts({ slug: input.slug });
  const ownerFlag = input.owner ? ` --owner ${input.owner}` : '';
  const orgFlag = (() => {
    if (org === '@all') return ' --org @all';
    if (!input.orgDefault) return '';
    if (org === input.orgDefault) return '';
    return ` --org ${org}`;
  })();
  const suffix = (() => {
    if (!(input.cause instanceof ConstraintError))
      return ` — retry: rhx keyrack unlock${ownerFlag} --env ${env} --key ${keyName}${orgFlag}`;
    if (!hint) return '';
    return ` — fix: ${hint}`;
  })();

  return `${bareMessage}${suffix}`.trim();
};
