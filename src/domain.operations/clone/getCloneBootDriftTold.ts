import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getCloneBootDriftFileContent } from './getCloneBootDriftFileContent';
import { CLONE_BOOT_DRIFT_TOLD_FILENAME } from './setCloneBootDriftTold';

/**
 * .what = the drift hash the nudge last told this clone of, or null when it told none
 * .why = the nudge reads it to stay silent about a drift it already named
 * .note = an unreadable latch fails loud with its path (vision case=21), never as a raw fs error
 */
export const getCloneBootDriftTold = (input: {
  cloneDir: string;
}): string | null => {
  const path = join(input.cloneDir, CLONE_BOOT_DRIFT_TOLD_FILENAME);
  if (!existsSync(path)) return null;
  return getCloneBootDriftFileContent({ path }).trim();
};
