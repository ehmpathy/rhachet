/**
 * .what = the file name of a retired per-enroll config: `settings.enroll.<hash>.local.json`
 */
const ENROLL_CONFIG_NAME =
  /^settings\.enroll\.(?<hash>[0-9a-f]{8})\.local\.json$/;

/**
 * .what = the actor hash a retired per-enroll config file name carries, or null for any
 *         other file name
 * .why = the stale-config reap reads which hash actor each retired file served
 */
export const asEnrollConfigHashOrNull = (input: {
  name: string;
}): string | null => ENROLL_CONFIG_NAME.exec(input.name)?.groups?.hash ?? null;
