import type { IsoTimeStamp } from 'iso-time';

import { computeCloneMessages } from './computeCloneMessages';
import { getAllCloneEpisodes } from './getAllCloneEpisodes';
import { getAmbiguousExidsWithinSpawnWindow } from './getAmbiguousExidsWithinSpawnWindow';
import type { CloneMessage } from './socket/asCloneMessage';

/**
 * .what = tail a clone's assistant replies from its linked transcript history, plus
 *   the signals a caller needs to explain a thin or empty read
 * .why =
 *   - `get` observes a clone via the brain-cli's OWN transcripts (linked into
 *     `history/`), never the live socket — so it works on a DEAD clone that has
 *     output, and needs no caller-cred gate (fs permissions alone bound it)
 *   - the MAP-then-TAIL order is mandatory: raw jsonl lines are mostly tool-results
 *     and thought blocks that carry no turn prose, so `--tail 1` over RAW lines
 *     would usually return empty and break the say→get round-trip. we map every
 *     complete line to its CloneMessage, DROP the textless nulls, THEN tail — so
 *     `--tail N` counts LOGICAL messages (both directions), never raw lines
 *   - `exidsAmbiguous` closes the same-cwd race honestly: when the history-link
 *     REFUSED to guess between two co-located clones (and quarantined the candidates),
 *     this reads those `.exids/*.ambiguous` markers so `get` warns "empty because the
 *     cwd was shared", never a silent unexplained empty
 *
 * .note = a torn final line (the brain mid-write, no final newline) is HELD BACK,
 *   not parsed — only complete lines reach asCloneMessage, so a completeness lag
 *   never reads as corrupt. a CORRUPT complete line fails loud there. a history
 *   symlink whose target vanished is reported in `exidsUnreadable`, never hidden
 * .note = `total` is the full logical-message count BEFORE the tail bound; `truncated`
 *   says whether the tail clipped it — so a machine caller reads the truncation
 *   signal it needs. no stderr write here (the invoker surfaces the warns), so this
 *   `get*` op stays a pure read with no hidden side effect
 */
export const getCloneOutput = (input: {
  cloneDir: string;
  actorsRoot: string;
  transcriptDir: string | null;
  spawnedAt: IsoTimeStamp;
  tail: number | 'all';
}): {
  messages: CloneMessage[];
  exidsUnreadable: string[];
  exidsAmbiguous: string[];
  total: number;
  truncated: boolean;
} => {
  // read each linked episode, plus the exids whose symlink target vanished
  const { episodes: episodesUnsorted, exidsUnreadable } = getAllCloneEpisodes({
    cloneDir: input.cloneDir,
  });

  // stable order: transcript mtime asc, exid as a deterministic same-mtime tiebreak
  // (spread-copy so the sort never mutates the array in place)
  const episodes = [...episodesUnsorted].sort((a, b) =>
    a.mtimeMs !== b.mtimeMs
      ? a.mtimeMs - b.mtimeMs
      : a.exid.localeCompare(b.exid),
  );

  // fold the episode transcripts into the logical directioned message stream
  const messagesAll = computeCloneMessages({ episodes });

  const total = messagesAll.length;
  // a tail of 0 must return ZERO messages — but `slice(-0)` is `slice(0)`, which
  // returns the WHOLE array (spec: `-0 < 0` is false), so an unguarded slice would
  // dump the full transcript for a bound the cli explicitly accepts as legal
  // (asTailBound allows n >= 0). guard it to the empty read it names
  const messages =
    input.tail === 'all'
      ? messagesAll
      : input.tail === 0
        ? []
        : messagesAll.slice(-input.tail);
  const truncated = messages.length < total;

  // surface any quarantined-ambiguous exid that is THIS clone's own — scoped to its
  // transcript dir (its brain + cwd) AND its spawn window, so a repo-wide marker from
  // an unrelated actor/brain/cwd never yields a false shared-cwd warn
  const exidsAmbiguous = getAmbiguousExidsWithinSpawnWindow({
    actorsRoot: input.actorsRoot,
    transcriptDir: input.transcriptDir,
    spawnedAt: input.spawnedAt,
  });

  return { messages, exidsUnreadable, exidsAmbiguous, total, truncated };
};
