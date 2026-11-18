import { createHash } from 'node:crypto';

/**
 * .what = the content hash of a boot's bytes: sha256, cut to 16 hex chars
 * .why = one identity for a boot revision, shared by every reader: the fleet gate keys its lead
 *        record by it, and a boot revision dir is named by it. a caller hashes the bytes it holds,
 *        so a hash and the bytes it names can never come from two reads
 * .note = 16 hex chars: wide enough that two boots of one actor never collide
 */
export const asBootContentHash = (input: { bytes: string | Buffer }): string =>
  createHash('sha256').update(input.bytes).digest('hex').slice(0, 16);
