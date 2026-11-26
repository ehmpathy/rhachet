import { BOOT_SPAWNED_DIR_PREFIX } from './constants';

/**
 * .what = the clone serial a spawn boot dir is named by, or null for a name that is no spawn boot
 * .why = the sweep enumerates `boots/` and keys each spawn boot by serial; the parse lives beside
 *        the prefix it reads, never inline at each reader
 * .note = a bare prefix names no clone, so it is no spawn boot
 */
export const asBootSpawnedSerialFromDirName = (input: {
  name: string;
}): string | null => {
  // a name with no prefix is no spawn boot
  if (!input.name.startsWith(BOOT_SPAWNED_DIR_PREFIX)) return null;

  // a bare prefix names no clone
  const serial = input.name.slice(BOOT_SPAWNED_DIR_PREFIX.length);
  return serial.length > 0 ? serial : null;
};
