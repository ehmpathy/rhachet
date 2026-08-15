import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';

import { getCloneDir } from './getCloneDir';
import { getCloneTranscriptText } from './getCloneTranscriptText';

/**
 * .what = how many times the dispatched message appears in a clone's raw transcript
 *   — the deterministic count `say` compares before vs after its dispatch to prove
 *   the message left the input buffer and was submitted
 * .why =
 *   - the brain records each USER turn to its transcript verbatim the moment it is
 *     submitted (before the assistant even replies), so a rise in this count is a
 *     FAST, deterministic proof of submission — no LLM cooperation, no slow reply
 *   - a COUNT (not a mere boolean present/absent) handles a repeated message: if the
 *     same text was said before, the baseline is already >= 1, and a fresh submit
 *     still ticks it up. `say` asserts after-count > before-count
 *   - the message is matched as its JSON-ESCAPED body — the exact form the brain
 *     writes it inside the transcript's `"...":"<escaped>"` field — so a message that
 *     holds quotes / newlines / backslashes still matches (a raw match would miss)
 *
 * .note = PURE read: it links no transcript of its own. a lazily-written transcript is
 *   made observable by an explicit `genCloneHistoryRelink` step the caller runs FIRST
 *   (so this `get*` carries no hidden filesystem side effect — get-verb purity)
 */
export const getCloneSubmittedCount = (input: {
  clone: CloneOndisk;
  message: string;
}): number => {
  const cloneDir = getCloneDir({
    actorDir: getActorOndiskDir({
      repoPath: input.clone.actor.repoPath,
      hash: input.clone.actor.hash,
    }),
    serial: input.clone.serial,
  });

  // match the message as the brain stores it: JSON-escaped, minus the two quotes
  // JSON.stringify adds — so quotes/newlines/backslashes in the message still match
  const needle = JSON.stringify(input.message).slice(1, -1);
  const transcript = getCloneTranscriptText({ cloneDir });
  return transcript.split(needle).length - 1;
};
