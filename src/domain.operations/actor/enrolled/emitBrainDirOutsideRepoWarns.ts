import { asBrainDirOutsideRepoWarnLines } from './asBrainDirOutsideRepoWarnLines';
import type { BrainDirOutsideRepoError } from './BrainDirOutsideRepoError';

/**
 * .what = print one `⚠️` block per brain dir a phase skipped because it lands outside the repo
 * .why = a skip is no error (exit code untouched), so its warn is the one place the human
 *   learns which dir was left alone and how to fix it
 * .note = no skips prints no line, not even a blank
 */
export const emitBrainDirOutsideRepoWarns = (input: {
  skips: BrainDirOutsideRepoError[];
}): void => {
  for (const skip of input.skips) {
    for (const line of asBrainDirOutsideRepoWarnLines({ error: skip }))
      console.log(line);
    console.log('');
  }
};
