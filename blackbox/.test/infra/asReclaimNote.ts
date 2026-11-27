/**
 * .what = the note a run prints when it reclaims the session daemons its tests left
 * .why = the reclaim is expected, so it is a note, never red; the count still shows, so a jump
 *   in it is visible
 */
export const asReclaimNote = (input: {
  reclaimed: Array<{ pid: number; command: string }>;
}): string =>
  [
    `ℹ reclaimed ${input.reclaimed.length} keyrack daemon${input.reclaimed.length === 1 ? '' : 's'} this run's tests left`,
    '   └─ a session daemon outlives the call that spawned it, so the run ends it',
    '',
  ].join('\n');
