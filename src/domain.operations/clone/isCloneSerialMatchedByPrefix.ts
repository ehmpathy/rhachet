/**
 * .what = whether a clone's full serial starts with a hex prefix, hyphens ignored
 * .why = `clone list` shows an abbreviated, de-hyphenated serial (`asCloneSerialHuman`);
 *   a caller types that short form back, so the match must ignore the uuid's hyphens
 *
 * .note = case-insensitive: a human may type the prefix in either case
 */
export const isCloneSerialMatchedByPrefix = (input: {
  serial: string;
  prefix: string;
}): boolean =>
  input.serial
    .replace(/-/g, '')
    .toLowerCase()
    .startsWith(input.prefix.toLowerCase());
