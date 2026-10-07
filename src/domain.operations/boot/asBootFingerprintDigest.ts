import { createHash } from 'node:crypto';

/**
 * .what = one sha256 digest over a set of fingerprint lines, keyed by a memo version
 * .why = the pure half of the `.this` boot fingerprint. the lines come from a disk walk, and
 *        the fold into one content address is compute alone — so it sits apart from the walk
 *        and can be tested with no filesystem at all
 *
 * .note = the lines are sorted here, so the digest is a function of the SET rather than of
 *   the order a glob happened to enumerate the disk in
 */
export const asBootFingerprintDigest = (input: {
  version: string;
  lines: string[];
}): string => {
  const hash = createHash('sha256');
  hash.update(`version=${input.version}\n`);
  for (const line of [...input.lines].sort()) hash.update(line);
  return hash.digest('hex');
};
