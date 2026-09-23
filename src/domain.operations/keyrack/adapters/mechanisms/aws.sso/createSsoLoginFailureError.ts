import { MalfunctionError } from 'helpful-errors';

/**
 * .what = build the MalfunctionError for a non-timeout `aws sso login` failure
 *
 * .why =
 *   - two sites reject with this same error — the `execSync` path and the `spawn`
 *     path — so the message and its metadata keys had two owners and could drift
 *   - 🚨 above all, the `exitCode` key name is FRAGILE, so this factory OWNS it:
 *     `helpful-errors` reserves `code` and strips it TWICE, in
 *     `omit(metadata, ['cause', 'code'])` before `fullMessage` is built and again
 *     in the `.metadata` getter. so an exit code written as `code` reaches NO
 *     reader on either channel, silently
 *   - ⇒ the input is a CLOSED shape, never a `Record<string, unknown>`. a caller
 *     that writes `{ code }` is now a TYPE ERROR rather than a silent drop — the
 *     trap is made impossible rather than merely detected
 *     (`rule.prefer.prevent-over-correct`, rung 1)
 *   - and a named factory makes the rendering purely testable: a unit test asserts
 *     the message carries the number with no process boundary crossed
 *     (`rule.forbid.unit.remote-boundaries`)
 *
 * .note = the peer of `createSsoTimeoutError` — the two are the `else if` / `else`
 *   halves of one `close` handler, and now take the same shape
 */
export const createSsoLoginFailureError = (input?: {
  /**
   * .what = the aws cli's exit code, under the ONE key that survives rendering
   * .why = `code` is reserved and stripped twice; see the docblock above
   */
  exitCode?: number | null;
  output?: string;
  profileName?: string;
}) =>
  new MalfunctionError('aws sso login failed', {
    ...input,
    hint: 'check network connectivity or aws cli configuration',
  });
