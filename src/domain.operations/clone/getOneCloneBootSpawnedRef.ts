import { getOneBootDriftFileContent } from '@src/domain.operations/boot/getOneBootDriftFileContent';

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CLONE_BOOT_SPAWNED_REF_FILENAME } from './setCloneBootSpawnedRef';

/**
 * .what = the boot revision hash a clone spawned on, or null when it holds no ref
 * .why = the drift read, the render readout, and the resume each ask which revision a clone
 *        spawned on; one read answers all three
 * .note = null marks a clone from before boot drift; an unreadable ref fails loud with its path
 */
export const getOneCloneBootSpawnedRef = (input: {
  cloneDir: string;
}): string | null => {
  const path = join(input.cloneDir, CLONE_BOOT_SPAWNED_REF_FILENAME);
  if (!existsSync(path)) return null;
  return getOneBootDriftFileContent({ path }).trim();
};
