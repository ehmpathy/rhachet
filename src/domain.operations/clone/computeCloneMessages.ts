import type { CloneMessage } from './socket/asCloneMessage';
import { asCloneMessage } from './socket/asCloneMessage';

/**
 * .what = fold a clone's episode transcripts into its logical directioned messages —
 *   the inbound `say`s and outbound replies, in transcript order
 * .why = a raw transcript holds one JSONL record per line; the observe path wants the
 *   human-readable CONVERSATION (both directions), not the wire records. a name for
 *   the fold keeps getCloneOutput a narrative line (rule.require.named-transformers)
 *   instead of a four-stage inline pipeline the reader must simulate. the fold: concat
 *   every COMPLETE line across episodes (the final torn line per episode is held back
 *   via `slice(0, -1)`), map each record to its CloneMessage, drop the textless nulls.
 */
export const computeCloneMessages = (input: {
  episodes: { content: string }[];
}): CloneMessage[] =>
  input.episodes
    .flatMap((episode) => episode.content.split('\n').slice(0, -1))
    .filter((line) => line.length > 0)
    .map((line) => asCloneMessage({ line }))
    .filter((message): message is CloneMessage => message !== null);
