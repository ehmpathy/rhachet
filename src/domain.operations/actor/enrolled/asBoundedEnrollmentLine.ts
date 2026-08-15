import { MalfunctionError } from 'helpful-errors';
import type { IsoTimeStamp } from 'iso-time';

import type { RoleSlug } from '@src/domain.objects/RoleSlug';

/**
 * .what = one append-only entry in an actor's enrollment.jsonl roles log
 * .why = records WHICH roles were enrolled, WHEN, the role-delta, and the
 *   caller-supplied WHY (the `--reason`), so the audit trail answers not just
 *   that an enrollment happened but why
 */
export interface EnrollmentRolesLogEntry {
  /**
   * .what = the on-disk schema version of this line (for tolerant reads)
   */
  schemaVersion: number;

  /**
   * .what = when the enrollment event occurred
   */
  at: IsoTimeStamp;

  /**
   * .what = the concrete resolved roleset this actor was enrolled with
   */
  roles: RoleSlug[];

  /**
   * .what = the role-delta spec as the caller expressed it (e.g. "-driver"), or null
   */
  delta: string | null;

  /**
   * .what = the caller-supplied `--reason`, or null when none was given
   */
  reason: string | null;
}

/**
 * .what = serialize an enrollment entry to a single JSON line, GUARANTEED to fit
 *   maxBytes (incl. the newline the writer will add); truncates the reason if needed
 * .why =
 *   - enrollment.jsonl is append-only and concurrent; only a line <= PIPE_BUF
 *     bytes appends atomically (see ENROLLMENT_LINE_MAX_BYTES). the reason is
 *     the one unbounded field, so it is the one we truncate
 *   - the cut is made on the DECODED string by whole code points (rune-safe, so
 *     a multi-byte emoji is never split), THEN the whole entry is re-serialized —
 *     so JSON escapes stay balanced and the reader never flags a corrupt line
 *
 * .note = a `…[+<n>B elided]` marker names how many BYTES of the original reason
 *   were dropped, so a reader knows the motive was cut, not lost
 * .note = fails loud if even a null/empty reason cannot fit — that means the
 *   FIXED fields alone exceed the cap, a real fault, never a silent overflow
 */
export const asBoundedEnrollmentLine = (input: {
  entry: EnrollmentRolesLogEntry;
  maxBytes: number;
}): string => {
  const { entry, maxBytes } = input;

  // the newline the writer appends counts against the cap
  const fits = (line: string): boolean =>
    Buffer.byteLength(line, 'utf8') + 1 <= maxBytes;

  // the common case: the full line already fits, no truncation needed
  const full = JSON.stringify(entry);
  if (fits(full)) return full;

  // a null reason cannot be cut — if the full line (reason=null) overflows,
  // the fixed fields alone exceed the cap: a real fault, fail loud
  if (entry.reason === null)
    return MalfunctionError.throw(
      'enrollment line exceeds the byte cap even with no reason — the fixed fields alone are too large',
      { maxBytes, lineBytes: Buffer.byteLength(full, 'utf8') },
    );

  // cut the reason by whole code points (rune-safe) until the line fits
  const runes = Array.from(entry.reason);
  const originalReasonBytes = Buffer.byteLength(entry.reason, 'utf8');

  const lineForRunePrefix = (keep: number): string => {
    const keptReason = runes.slice(0, keep).join('');
    const elidedBytes =
      originalReasonBytes - Buffer.byteLength(keptReason, 'utf8');
    const truncatedReason = `${keptReason}…[+${elidedBytes}B elided]`;
    return JSON.stringify({ ...entry, reason: truncatedReason });
  };

  // binary-search the largest rune-prefix whose line still fits (monotonic: more
  // runes => longer line => less likely to fit)
  // .note = deliberate mutation — lo/hi/best are the binary-search accumulator,
  //         bounded to this function; they never escape the local scope
  let lo = 0;
  let hi = runes.length;
  let best: string | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const candidate = lineForRunePrefix(mid);
    if (fits(candidate)) {
      best = candidate;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // even an empty reason + the elision marker cannot fit => the fixed fields are too large
  if (best === null)
    return MalfunctionError.throw(
      'enrollment line exceeds the byte cap even with an empty reason — the fixed fields are too large',
      { maxBytes },
    );

  return best;
};
