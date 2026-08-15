import type { IsoTimeStamp } from 'iso-time';

import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import { getActorsIndexDir } from '@src/domain.operations/actor/enrolled/getActorsIndexDir';

import { existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { genAtomicSymlinkClaim } from './genAtomicSymlinkClaim';
import { getAllEligibleTranscriptCandidates } from './getAllEligibleTranscriptCandidates';
import { getBrainTranscriptDir } from './getBrainTranscriptDir';
import { getCloneHistoryDir } from './getCloneHistoryDir';

/**
 * .what = discover the brain's newest own-transcript for this cwd + symlink it into
 *   the clone's history — or, when TWO clones share a cwd and race, refuse to link
 *   and quarantine the ambiguous candidates instead
 * .why =
 *   - a clone's history is ZERO-COPY: it symlinks the brain-cli's own `<exid>.jsonl`
 *     transcript, so `get` reads the real thing and rhachet stores only the handle.
 *     the exid lives in the transcript's filename (an interactive TUI never prints a
 *     parseable session id), so we DISCOVER the file rather than parse the stream
 *   - two co-located clones (the `-driver`/`-foreman` one-cwd case) could each grab
 *     the same "newest" transcript. the atomic `.exids/<exid>` claim SERIALIZES the
 *     election — exactly one clone links any exid, never two (privacy: no clone ever
 *     links another's transcript). when 2+ candidates are equally plausible, we do
 *     NOT guess: we REFUSE to link and write a `.exids/<exid>.ambiguous` quarantine
 *     per candidate, so (a) the eligible pool SHRINKS — a later fresh episode links
 *     cleanly instead of a forever-empty history — and (b) a separate later `get`
 *     reads the quarantine marker and surfaces a real WARN, never a silent empty
 *
 * .note = findsert: a re-link of an already-claimed exid is a no-op (the claim
 *   excludes it from the eligible pool), so the per-episode re-link poll is safe to
 *   run repeatedly. per-brain: a brain with no transcript layout (null dir) links no
 *   transcript. the quarantine + history links both target the transcript's ABSOLUTE
 *   path, so a later reader resolves them off-repo under the brain's own config dir
 */
export const genCloneHistoryLink = (input: {
  cloneDir: string;
  actorsRoot: string;
  cwd: string;
  brain: BrainSlug;
  spawnedAt: IsoTimeStamp;
}): { linked: string | null; ambiguous: string[] } => {
  // per-brain: no known transcript layout → no history to link
  const transcriptDir = getBrainTranscriptDir({
    brain: input.brain,
    cwd: input.cwd,
  });
  if (transcriptDir === null) return { linked: null, ambiguous: [] };

  // the brain has not written any transcript for this cwd yet → benign, no link
  if (!existsSync(transcriptDir)) return { linked: null, ambiguous: [] };

  const exidsDir = getActorsIndexDir({
    actorsRoot: input.actorsRoot,
    index: 'exids',
  });

  // gather this-spawn-or-later transcripts that are neither claimed nor quarantined
  const eligible = getAllEligibleTranscriptCandidates({
    transcriptDir,
    exidsDir,
    spawnedAt: input.spawnedAt,
  });

  // no fresh transcript to link — benign (already-claimed or none yet)
  if (eligible.length === 0) return { linked: null, ambiguous: [] };

  // 2+ equally-plausible candidates — REFUSE to guess; quarantine each so the pool
  // converges and a later `get` can explain the empty history
  if (eligible.length >= 2) {
    for (const candidate of eligible)
      genAtomicSymlinkClaim({
        linkPath: join(exidsDir, `${candidate.exid}.ambiguous`),
        target: candidate.transcriptPath,
      });
    return { linked: null, ambiguous: eligible.map((c) => c.exid) };
  }

  // exactly one candidate (the 0-and-2+ cases returned above) — win its claim
  const only = eligible[0]!;
  const claimed = genAtomicSymlinkClaim({
    linkPath: join(exidsDir, only.exid),
    target: only.transcriptPath,
  });

  // a peer won the claim between our read + our claim → no transcript for us to link
  if (!claimed) return { linked: null, ambiguous: [] };

  // link the claimed transcript into this clone's history (findsert on the link)
  const historyDir = getCloneHistoryDir({ cloneDir: input.cloneDir });
  mkdirSync(historyDir, { recursive: true });
  const historyLink = join(historyDir, `${only.exid}.jsonl`);
  if (!existsSync(historyLink)) symlinkSync(only.transcriptPath, historyLink);

  return { linked: only.exid, ambiguous: [] };
};
