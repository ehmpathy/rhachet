import { computeCloneInputState } from '../screen/computeCloneInputState';
import type { CloneScreenRead } from '../screen/genCloneScreenFeed';
import {
  CLONE_SUBMIT_READY_POLL_MS,
  CLONE_SUBMIT_RESEND_MAX,
  CLONE_SUBMIT_TAKEN_WINDOW_MS,
} from './constants';

/**
 * .what = after the submit `\r`, watch the input box until the message LEAVES it; when it
 *   still sits there past the window, re-send the `\r` — a bounded count of times
 * .why =
 *   - the content commit is observed before the `\r` (awaitCloneSubmitReady), but the `\r`
 *     itself was fire-and-forget. a fresh claude TUI that still draws its boot animation can
 *     swallow that one keystroke, so the message sits in the box, unsent, and the say lands
 *     `buffered` / `input-region-holds-text` (measured CI 2026-10-08, claude-code 2.1.292)
 *   - the daemon holds the live screen, so whether the submit was TAKEN is observable, the
 *     same way the commit was. a taken submit drops the box count back to the baseline
 *   - a bare `\r` appends no text, so a re-send cannot duplicate the message
 *
 * .note = it acts only on what it saw. an unreadable screen, or a content commit that was
 *   never observed (`observedReady: false`), offers no baseline to compare against, so it
 *   re-sends naught and reports `taken: null` — the verdict channel reports what landed
 */
export const awaitCloneSubmitTaken = async (input: {
  read: () => CloneScreenRead;
  message: string;
  /** the box count taken BEFORE the content write — a taken submit falls back to it */
  countBefore: number;
  /** whether awaitCloneSubmitReady saw the content commit into the box */
  observedReady: boolean;
  /** write one more submit `\r` into the child */
  resubmit: () => void;
  /** wait between polls, injected in a clamp to keep it deterministic */
  sleep?: (ms: number) => Promise<void>;
  /** read the clock, injected in a clamp */
  now?: () => number;
}): Promise<{ taken: boolean | null; resubmits: number }> => {
  const sleep =
    input.sleep ??
    ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)));
  const now = input.now ?? (() => Date.now());

  // no observed commit means no observed baseline to leave — naught to verify
  if (!input.observedReady) return { taken: null, resubmits: 0 };

  // .note = deliberate mutation — a bounded resend counter local to this call
  let resubmits = 0;
  for (;;) {
    // watch one window for the message to leave the box
    const outcome = await awaitCloneBoxCleared({ ...input, sleep, now });
    if (outcome === 'cleared') return { taken: true, resubmits };
    if (outcome === 'unreadable') return { taken: null, resubmits };

    // the box still holds the message past the window; give up once the resends are spent
    if (resubmits >= CLONE_SUBMIT_RESEND_MAX)
      return { taken: false, resubmits };

    // the `\r` was lost — send it again
    input.resubmit();
    resubmits += 1;
  }
};

/**
 * .what = poll the box for one window; report whether the message left it
 * .why = isolates the window loop so the resend loop above reads as narrative
 */
const awaitCloneBoxCleared = async (input: {
  read: () => CloneScreenRead;
  message: string;
  countBefore: number;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}): Promise<'cleared' | 'held' | 'unreadable'> => {
  const startedAt = input.now();
  for (;;) {
    // an unreadable screen mid-watch offers no observation
    const screen = input.read();
    if (!screen.live) return 'unreadable';

    // the count fell back to the baseline — the submit was taken
    const state = computeCloneInputState({ screen, message: input.message });
    if (state.countInInput <= input.countBefore) return 'cleared';

    // the window elapsed with the message still in the box
    if (input.now() - startedAt >= CLONE_SUBMIT_TAKEN_WINDOW_MS) return 'held';

    await input.sleep(CLONE_SUBMIT_READY_POLL_MS);
  }
};
