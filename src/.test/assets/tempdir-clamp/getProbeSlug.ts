import { ConstraintError } from 'helpful-errors';

/**
 * .what = the slug the autoprune clamp handed this probe run
 * .why = the clamp counts only dirs that carry its own slug, so a probe that fell back to a
 *        shared default would let one run's count see a peer's dirs. absent, it refuses loud
 */
export const getProbeSlug = (): string => {
  const slug = process.env.TEMPDIR_CLAMP_SLUG;
  if (!slug)
    throw new ConstraintError('a tempdir-clamp probe was run with no slug', {
      env: 'TEMPDIR_CLAMP_SLUG',
      hint: 'run the probes via genTempDirPhysical.integration.test.ts, which sets it',
    });
  return slug;
};

/**
 * .what = how long a probe holds its dirs open after allocation, in ms
 * .why = the interrupt case must signal a run while its dirs are live; a hold keeps them live
 *        long enough to be signaled. absent, the probe holds for naught (0); malformed, it
 *        refuses loud, since a NaN hold would silently release the dirs the case must keep live
 */
export const getProbeHoldMs = (): number => {
  // unset means no hold; an empty value is a value meant to be set, so it is malformed, never 0
  const raw = process.env.TEMPDIR_CLAMP_HOLD_MS;
  if (raw === undefined) return 0;
  const holdMs = raw.trim() === '' ? Number.NaN : Number(raw);
  if (!Number.isInteger(holdMs) || holdMs < 0)
    throw new ConstraintError('a tempdir-clamp probe was handed a hold that is not a count of ms', {
      env: 'TEMPDIR_CLAMP_HOLD_MS',
      value: process.env.TEMPDIR_CLAMP_HOLD_MS,
      hint: 'set it to a whole number of ms, e.g. 60000 — or leave it unset for no hold',
    });
  return holdMs;
};
