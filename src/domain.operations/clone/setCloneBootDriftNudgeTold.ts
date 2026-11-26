import { asCloneBootDriftLines } from './asCloneBootDriftLines';
import { getOneCloneBootDriftNudge } from './getOneCloneBootDriftNudge';
import { setCloneBootDriftTold } from './setCloneBootDriftTold';

/**
 * .what = surface a clone's drift once: latch the drift as told, and return the notice lines, or
 *         null when no notice is owed
 * .why = the order (decide, latch, then render) is behavior: a test reaches it here, and the cli
 *        arm only prints the lines
 *
 * .note = the latch lands before the caller prints, so a fault in the print never repeats the
 *         notice on the next stop
 */
export const setCloneBootDriftNudgeTold = (input: {
  actorDir: string;
  cloneDir: string;
  serial: string;
  address: string;
}): { lines: string[] } | null => {
  // silent unless a notice is owed
  const drift = getOneCloneBootDriftNudge({
    actorDir: input.actorDir,
    cloneDir: input.cloneDir,
    serial: input.serial,
  });
  if (drift === null) return null;

  // surface it once: latch first
  setCloneBootDriftTold({ cloneDir: input.cloneDir, drift: drift.drift });
  return {
    lines: asCloneBootDriftLines({
      for: 'nudge',
      address: input.address,
      drift,
    }),
  };
};
