import { asIsoTimeStamp, type IsoTimeStamp } from 'iso-time';

/**
 * .what = compute expiration timestamp, clamped to the shortest applicable bound
 * .why = extracts date manipulation from orchestrators for narrative readability
 *
 * .note = PURE, in full. it reads no clock, writes no output, and performs no i/o — so it is
 *         a transformer under `define.domain-operation-grains`. `now` is an INPUT, supplied
 *         by the orchestrator, because a clock read is i/o and a `compute*` may take none.
 *         the maxDuration cap is likewise REPORTED as `cappedByMaxDuration`, never announced
 *
 * .note = ⚠️ the purity took TWO passes, and the first shipped a comment that hid its own
 *         other half. the `console.warn` moved out to the orchestrator, and the note left
 *         behind read "PURE. it reads no clock but `Date.now()`" — an admission written in
 *         the grammar of a claim. three review rounds scanned the word PURE and moved on.
 *         a caveat welded onto an absolute is worse than no note: it reads as settled to
 *         every reader but the one who wrote it
 *
 * .note = both halves buy the same guarantee back, which is the tell that the rule is real.
 *         the warn's removal made `cappedByMaxDuration` assertable with no console spy; the
 *         clock's removal makes the ttl assertable to the MILLISECOND, where the tests had
 *         to round to the nearest minute to absorb the drift a live `Date.now()` injected
 *
 * .note = THREE bounds apply, and the shortest always wins:
 *         1. the requested duration      — `--duration`, or the 30m/9h default
 *         2. the per-key maxDuration cap — from the host manifest, when set
 *         3. the grant's OWN expiry      — the true life the mech reports
 *
 *         a ttl is a promise about a secret, and the two ways to break it are not
 *         symmetric. too-short costs a re-unlock — an inconvenience. too-long yields a
 *         credential that READS alive and IS dead, which sends a human to debug the wrong
 *         subsystem entirely. so the safe direction is the shortest bound.
 *
 *         bound 3 is the one a reader is most likely to drop, because bounds 1 and 2 are
 *         durations while it is an absolute stamp. drop it and a github app installation
 *         token — which dies in an hour — is held under the 9-hour default, so `status`
 *         reports `expires in: 540m` for a secret github killed at 60, and whoever debugs
 *         the 401 that follows is sent to the wrong subsystem. min() only ever shortens a
 *         value that would otherwise be a lie, so it cannot regress a caller.
 *
 *         it is written against the mech adapter CONTRACT — `deliverForGet` returns an
 *         optional `expiresAt` — not against the github mech, so aws-sso and github-oidc
 *         get the same honesty for free.
 *
 * .note = only bound 2 is reported. bound 3 wins on EVERY github-app unlock (55m beats the
 *         540m default), so a notice on it would fire on the normal path — and a caution a
 *         reader learns to skip takes the maxDuration one down with it. the `expires in:`
 *         leaf is where bound 3 is already visible, and after this clamp that number is
 *         true where it used to be a lie
 */
export const computeExpiresAt = (input: {
  now: IsoTimeStamp;
  requestedDurationMs: number;
  maxDurationMs: number | null;
  grantExpiresAt?: IsoTimeStamp;
}): {
  expiresAt: IsoTimeStamp;
  effectiveDurationMs: number;
  cappedByMaxDuration: boolean;
} => {
  // bound 2 — the per-key cap, when the host manifest sets one.
  // .note = a `min` says "the shortest wins" in one expression, which is this whole
  //         operation's rule (see the three bounds above). the null check is the cap's
  //         ABSENCE, not a second policy — so no branch assigns the value twice
  const effectiveDurationMs =
    input.maxDurationMs !== null
      ? Math.min(input.requestedDurationMs, input.maxDurationMs)
      : input.requestedDurationMs;

  // the flag reads off the OUTCOME rather than re-derives the condition — the two can
  // no longer disagree, and the caller renders it where i/o belongs
  const cappedByMaxDuration = effectiveDurationMs !== input.requestedDurationMs;

  // the caller's clock read, handed in — see the purity note above
  const nowMs = new Date(input.now).getTime();
  const expiresAtFromDuration = nowMs + effectiveDurationMs;

  // clamp to the credential's own life, when the mech reports one
  const expiresAtFromGrant = input.grantExpiresAt
    ? new Date(input.grantExpiresAt).getTime()
    : null;
  const expiresAtMs =
    expiresAtFromGrant !== null && expiresAtFromGrant < expiresAtFromDuration
      ? expiresAtFromGrant
      : expiresAtFromDuration;

  const expiresAt = asIsoTimeStamp(new Date(expiresAtMs));

  return {
    expiresAt,
    effectiveDurationMs: expiresAtMs - nowMs,
    cappedByMaxDuration,
  };
};
