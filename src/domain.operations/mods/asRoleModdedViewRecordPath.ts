import { join } from 'node:path';

/**
 * .what = where a role dir keeps its modded view record
 * .why = one path, so the writer, the reader and the restorer cannot drift apart
 *
 * .note = a dot file in the role dir: no boot, skill or brief scan reads the role dir root
 */
export const asRoleModdedViewRecordPath = (input: {
  roleDir: string;
}): string => join(input.roleDir, '.modded.json');
