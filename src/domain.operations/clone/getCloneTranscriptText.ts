import { getAllCloneEpisodes } from './getAllCloneEpisodes';

/**
 * .what = the RAW concatenated text of a clone's linked transcript episodes — every
 *   byte the brain-cli wrote, user turns and assistant turns alike, unparsed
 * .why =
 *   - `say`'s submit self-verify needs to confirm its OWN dispatched message reached
 *     the brain's transcript (proof the message left the input buffer and was
 *     submitted). the brain records each USER turn verbatim on submit, so a raw text
 *     search for the dispatched message is a deterministic oracle — it needs no LLM
 *     cooperation and no user/assistant turn parse
 *   - distinct from getCloneOutput, which FOLDS the raw lines to DIRECTIONED messages
 *     (both inbound `say`s and outbound replies, for `get`) and DROPS every textless
 *     record. the submit-verify needs the RAW stream — the fold both re-shapes the user
 *     turn and can drop a textless one, and the verify needs the verbatim bytes as its
 *     oracle — so this is its own lean reader
 *   - it composes getAllCloneEpisodes (the one owner of the history-dir read + the
 *     ENOENT-skip) and joins the raw content, so the readdir→filter→ENOENT walk lives
 *     in ONE place (rule.prefer.decomposable-architecture); the exidsUnreadable split
 *     is discarded here — a vanished episode is simply absent from the concat
 *
 * .note = a vanished symlink target is skipped (its bytes are simply absent from the
 *   concat), not thrown — the verify treats an unreadable episode as "no evidence
 *   here", and the poll's timeout is the loud backstop if the message never appears
 */
export const getCloneTranscriptText = (input: { cloneDir: string }): string =>
  getAllCloneEpisodes({ cloneDir: input.cloneDir })
    .episodes.map((episode) => episode.content)
    .join('\n');
