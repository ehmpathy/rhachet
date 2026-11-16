import { getDuration, type IsoTimeStamp, sumDurations } from 'iso-time';

/**
 * .what = the time from now until a moment, in the largest whole unit (`4d`, `6h`, `25m`)
 * .why = a reset reads at a glance as "how long", never as a timestamp to subtract; and a render
 *   that holds no clock time keeps every snapshot of it free of one
 * .note = a moment already past reads `now`
 */
export const asTimeUntilHuman = (input: {
  at: IsoTimeStamp;
  now: IsoTimeStamp;
}): string => {
  // a moment already past reads `now`; utc iso stamps of one format sort as text
  if (input.at <= input.now) return 'now';

  // the span in whole minutes, then the largest whole unit
  const span = getDuration({
    of: { range: { since: input.now, until: input.at } },
  });
  const minutes = Math.floor(
    sumDurations([span], { as: 'minutes' }).minutes ?? 0,
  );
  if (minutes <= 0) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};
