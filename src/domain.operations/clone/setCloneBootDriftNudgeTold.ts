import { asCloneBootDriftLines } from './asCloneBootDriftLines';
import { getOneCloneBootDriftNudge } from './getOneCloneBootDriftNudge';
import { setCloneBootDriftTold } from './setCloneBootDriftTold';

/**
 * .what = tell a clone of its drift once: latch the drift as told, and return the nudge lines,
 *         or null when no nudge is owed
 * .why = the order (decide, latch, then render) is behavior: a test reaches it here, and the cli
 *        arm only prints the lines and sets the exit code
 *
 * .note = the latch lands before the caller prints, so a fault in the print never repeats the
 *         block on the next stop
 */
export const setCloneBootDriftNudgeTold = (input: {
  actorDir: string;
  cloneDir: string;
  address: string;
}): { lines: string[] } | null => {
  // silent unless a nudge is owed
  const drift = getOneCloneBootDriftNudge({
    actorDir: input.actorDir,
    cloneDir: input.cloneDir,
  });
  if (drift === null) return null;

  // tell it once: latch first
  setCloneBootDriftTold({ cloneDir: input.cloneDir, drift: drift.drift });
  return {
    lines: asCloneBootDriftLines({
      for: 'nudge',
      address: input.address,
      drift,
    }),
  };
};
