import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getCloneHistoryDir } from './getCloneHistoryDir';

/**
 * .what = read every linked episode transcript in a clone's `history/` dir, yields
 *   each episode's { exid, mtimeMs, content } plus the exids whose symlink target
 *   vanished (so the caller can warn instead of a silent omit)
 * .why =
 *   - `getCloneOutput` needs the raw episode transcripts before it folds them into
 *     messages; a name for this read keeps that orchestrator a narrative line instead
 *     of a four-stage inline readdir→filter→map→filter pipeline the reader must
 *     simulate (rule.require.named-transformers)
 *   - the `exidsUnreadable` split is the honest half: a history symlink whose target
 *     was reclaimed (ENOENT) is reported, never hidden behind an empty concat
 *
 * .note = a NON-ENOENT fault (EACCES, EIO, …) rethrows loud rather than hide a real
 *   permission/io problem (failhide). only a vanished target is a soft skip.
 * .note = order is NOT applied here — the caller sorts (mtime asc, exid tiebreak), so
 *   this read stays a pure discovery with no order policy baked in
 */
export const getAllCloneEpisodes = (input: {
  cloneDir: string;
}): {
  episodes: { exid: string; mtimeMs: number; content: string }[];
  exidsUnreadable: string[];
} => {
  const historyDir = getCloneHistoryDir({ cloneDir: input.cloneDir });
  const exidsUnreadable: string[] = [];

  if (!existsSync(historyDir)) return { episodes: [], exidsUnreadable };

  const episodes = readdirSync(historyDir)
    .filter((name) => name.endsWith('.jsonl'))
    .map((name) => {
      const exid = name.slice(0, -'.jsonl'.length);
      const linkPath = join(historyDir, name);
      try {
        return {
          exid,
          mtimeMs: statSync(linkPath).mtimeMs,
          content: readFileSync(linkPath, 'utf8'),
        };
      } catch (error) {
        // a vanished/reclaimed target is reported, never hidden.
        // .note = deliberate mutation — a bounded accumulator local to this fold,
        //   appended only on the ENOENT branch; the array never escapes this
        //   function before it is returned, so no external reader races the mutation
        if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
          exidsUnreadable.push(exid);
          return null;
        }
        throw error;
      }
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return { episodes, exidsUnreadable };
};
