import { getDuration, type IsoDuration, type IsoTimeStamp } from 'iso-time';

/**
 * .what = how long a grant has left before it expires, floored at zero
 * .why = status reports the time left as a duration, never a bare count of milliseconds
 *        a reader must divide (rule.forbid.unit-suffixed-time-fields)
 *
 * .note = `null` for a grant with no expiry, never an infinite duration: the wire is
 *         JSON, which cannot carry `Infinity`
 * .note = a grant already past its expiry reads as a zero duration, so the render says
 *         `expired` and never counts below zero
 */
export const getOneKeyrackExpiresIn = (input: {
  expiresAt: IsoTimeStamp | null;
  now: IsoTimeStamp;
}): IsoDuration | null => {
  // no expiry: the grant never dies
  if (!input.expiresAt) return null;

  // past its expiry: none left
  const isPast =
    new Date(input.expiresAt).getTime() <= new Date(input.now).getTime();
  if (isPast) return { seconds: 0 };

  // otherwise, the span from now to the expiry
  return getDuration({
    of: { range: { since: input.now, until: input.expiresAt } },
  });
};
