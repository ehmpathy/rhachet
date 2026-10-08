import { readFileSync } from 'node:fs';

/**
 * .what = whether a parsed memo holds the one shape the writer emits — digest → integer
 * .why = the memo is a file on disk, so a hand edit or a torn write from an older rhachet can
 *        leave any shape there. a count read from a malformed memo would be a wrong count
 */
const isBrainTokenMemoShape = (
  value: unknown,
): value is Record<string, number> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every(
    (count) => typeof count === 'number' && Number.isInteger(count),
  );

/**
 * .what = reads the token-count memo, or an empty one where no usable memo is on disk
 * .why = the read half of the memo boundary. the memo is an optimization, so an absent or
 *        malformed file costs a recount — the counter then writes a clean memo in its place
 *
 * 🔴 .note = the absorb is an ALLOWLIST: an absent file (`ENOENT`), unparseable json, or a shape
 *   the writer never emits. each means "no memo", and each is repaired by the next write. every
 *   other fault — a permission refusal, an `EIO` — throws (`rule.forbid.failhide`)
 */
export const getOneBrainTokenMemo = (input: {
  path: string;
}): Record<string, number> => {
  // read the raw memo; an absent file is the first run, never a fault
  const raw = (() => {
    try {
      return readFileSync(input.path, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return null;
      throw error;
    }
  })();
  if (raw === null) return {};

  // parse it; a torn or hand-edited file is a memo to rebuild, never a count to trust
  const parsed = (() => {
    try {
      return JSON.parse(raw) as unknown;
    } catch (error) {
      if (error instanceof SyntaxError) return null;
      throw error;
    }
  })();
  if (!isBrainTokenMemoShape(parsed)) return {};
  return parsed;
};
