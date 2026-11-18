import { BOOT_REVISION_DIR_PREFIX } from './constants';

/**
 * .what = the content hash a boot revision dir is named by, or null for a name that is no revision
 * .why = the sweep enumerates `boots/` and keys each revision by hash; the parse lives beside the
 *        prefix it reads, never inline at each reader
 */
export const asBootRevisionHashFromDirName = (input: {
  name: string;
}): string | null =>
  input.name.startsWith(BOOT_REVISION_DIR_PREFIX)
    ? input.name.slice(BOOT_REVISION_DIR_PREFIX.length)
    : null;
