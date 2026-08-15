import type { IsoTimeStamp } from 'iso-time';

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isTranscriptWithinSpawnWindow } from './isTranscriptWithinSpawnWindow';

/**
 * .what = the transcripts eligible for a fresh history-link: within THIS spawn's
 *   window, and neither already claimed nor quarantined-ambiguous
 * .why = a name for the candidate-discovery scan keeps genCloneHistoryLink a
 *   narrative line (rule.require.named-transformers) instead of a four-stage inline
 *   pipeline the reader must simulate. a communicator, not a transformer — it reads
 *   the transcript dir and stats each file, then screens by spawn-window + claim.
 *
 * .note = deliberate sync I/O. the scan is bounded by the EXTERNAL brain-cli's own
 *   per-cwd session history (a handful of `.jsonl` files), NOT by rhachet's clone
 *   counts, so the readdir + per-file stat is a small, fixed cost — not an unbounded
 *   hot-loop. an async rewrite would thread a promise through this pure-shaped
 *   discovery for no real latency win at this scale; the early mtime-filter
 *   optimization is the ledgered follow-up if a session dir ever grows large.
 */
export const getAllEligibleTranscriptCandidates = (input: {
  transcriptDir: string;
  exidsDir: string;
  spawnedAt: IsoTimeStamp;
}): { exid: string; transcriptPath: string; mtimeMs: number }[] =>
  readdirSync(input.transcriptDir)
    .filter((name) => name.endsWith('.jsonl'))
    .map((name) => {
      const exid = name.slice(0, -'.jsonl'.length);
      const transcriptPath = join(input.transcriptDir, name);
      return {
        exid,
        transcriptPath,
        mtimeMs: statSync(transcriptPath).mtimeMs,
      };
    })
    .filter((candidate) =>
      isTranscriptWithinSpawnWindow({
        transcriptMtimeMs: candidate.mtimeMs,
        spawnedAt: input.spawnedAt,
      }),
    )
    .filter(
      (candidate) =>
        !existsSync(join(input.exidsDir, candidate.exid)) &&
        !existsSync(join(input.exidsDir, `${candidate.exid}.ambiguous`)),
    );
