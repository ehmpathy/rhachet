import type { CloneInputState } from '../screen/computeCloneInputState';

/**
 * .what = the reasons a server-side dequeue pre-check refuses a write — the `withheld`
 *   reason slugs, as a value that is the single source of truth for the type
 * .why = the `focus` whitelist proceeds ONLY on `focus: 'input'` with a clear region, so a
 *   refusal is one of three: a modal ate the keyboard, the focus is unrecognized (an
 *   unknown screen — refuse rather than paste blind), or the region is dirty. only the
 *   dirty one is forceable (V3, F06); the two focus refusals have no force path. owned HERE
 *   by the pre-check that PRODUCES them, so a generic wire/queue primitive that carries a
 *   refusal (genCloneWriteQueue, sayClone) imports from the producer, never from the
 *   `say`-specific verdict module that merely consumes it (r11.n2 scope-leak fix). the type
 *   DERIVES from this tuple, so a new slug added here is compiler-forced into every narrow —
 *   the hand-maintained shadow array could drift from its union silently (r11-i018-n1)
 */
const CLONE_WITHHELD_REASONS = [
  'modal-holds-focus',
  'focus-unrecognized',
  'input-region-dirty',
] as const;

export type CloneWithheldReason = (typeof CLONE_WITHHELD_REASONS)[number];

/**
 * .what = is a server reject reason one of the three `withheld` slugs — a pre-check refusal
 * .why = the wire's `rejected` ack carries a reason STRING for every refusal — a withheld
 *   pre-check refusal (a slug the caller branches on) OR an operational one (a full queue, a
 *   drained clone, a pty fault). the client parts the two on THIS: a known slug is a `withheld`
 *   verdict a retry policy reads; any other string is a reach fault that fails loud, unchanged
 */
export const isCloneWithheldReason = (
  reason: string | null,
): reason is CloneWithheldReason =>
  reason !== null &&
  (CLONE_WITHHELD_REASONS as readonly string[]).includes(reason);

/**
 * .what = the decided pre-check outcome — proceed with the write, or withhold it with a reason
 * .why = the server runs this at DEQUEUE, when the read is current at the write (the queue
 *   serializes the write, so a client-side probe taken before enqueue may be stale by up to 128
 *   dispatches). `proceed: true` hands the bytes to the pty; `proceed: false` acks a refusal and
 *   releases the drain latch (V15), with the `CloneWithheldReason` a caller branches on
 */
export type CloneDispatchPrecheck =
  | { proceed: true }
  | { proceed: false; reason: CloneWithheldReason };

/**
 * .what = decide whether a queued write may reach the pty, from the current input state
 * .why = the write channel is a `focus` whitelist: it proceeds ONLY on `focus: 'input'` with a
 *   region that is clear, or dirty under `--force`. the branches are ordered by force-path — the
 *   two focus refusals are checked FIRST, so `--force` can never override them; only the dirty
 *   region is forceable (V3, F06, case=6). a modal ate the keyboard, or an unknown screen means
 *   we refuse rather than paste blind
 *
 * .note = `force` overrides ONLY `input-region-dirty`. a `modal-holds-focus` or
 *   `focus-unrecognized` refusal has no force path and stands regardless of the flag
 */
export const computeCloneDispatchPrecheck = (input: {
  state: CloneInputState;
  force: boolean;
}): CloneDispatchPrecheck => {
  // a modal holds focus — refuse, no force path (a say never answers a permission prompt, V3)
  if (input.state.focus === 'modal')
    return { proceed: false, reason: 'modal-holds-focus' };

  // an unknown screen — refuse rather than paste blind, no force path
  if (input.state.focus === 'unrecognized')
    return { proceed: false, reason: 'focus-unrecognized' };

  // focus is input, yet the region holds a human's uncommitted work — refuse unless forced
  if (input.state.input === 'dirty' && !input.force)
    return { proceed: false, reason: 'input-region-dirty' };

  // focus input, region clear (or dirty-and-forced) — the write proceeds
  return { proceed: true };
};
