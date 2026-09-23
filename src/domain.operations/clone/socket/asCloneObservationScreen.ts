import type { CloneGetReply } from './asCloneGetReply';
import type { CloneSayBaseline } from './computeCloneSayBaseline';
import type { CloneSayObservation } from './computeCloneSayVerdict';

/**
 * .what = map a probe reply + the pre-dispatch baseline to an observation screen — the rise
 *   pair a verdict reads, or null when the read was probe-blind
 * .why = a capable read carries `focus`/`input` plus two RISES (a post count compared against
 *   the baseline, never a presence — a daemon repeats one text, so a prior tick's echo must
 *   not read as this dispatch). a probe-blind reply carries no counts, so it maps to null —
 *   the honest degrade `unreadable` rests on, never a false `absent` read (V7). one owner of
 *   the reply→screen shape, so the observe loop reads a named call rather than an inline
 *   ternary (r3/r4-n)
 *
 * .note = a rise is asserted ONLY against a MEASURED baseline. a probe-blind baseline carries
 *   `null` counts (unmeasured), so a rise against a null baseline is false — never `post > 0`.
 *   without this guard a capable post-read against a prior tick's echo (a daemon repeats one
 *   text) would rise `1 > 0` against a baseline that never measured that echo, and mint a false
 *   `enqueued` on a dropped message (r006-i010-b1). with it, that read falls to `absent`
 */
export const asCloneObservationScreen = (input: {
  reply: CloneGetReply;
  baseline: CloneSayBaseline;
}): CloneSayObservation['screen'] =>
  input.reply.probe === 'capable'
    ? {
        focus: input.reply.state.focus,
        input: input.reply.state.input,
        countInInputRose:
          input.baseline.countInInput !== null &&
          input.reply.state.countInInput > input.baseline.countInInput,
        countOnScreenRose:
          input.baseline.countOnScreen !== null &&
          input.reply.state.countOnScreen > input.baseline.countOnScreen,
        // `queued` is carried THROUGH, never differenced. every field above is a rise because a
        // count is cumulative and a prior echo must not read as this dispatch; a queue is not a
        // count — it is a present-tense state, and "the queue holds a message NOW" is the whole
        // question. a rise would report `false` for a dispatch that joined an already-busy queue,
        // which is the commonest `enqueued` there is
        queued: input.reply.state.queued,
      }
    : null;
