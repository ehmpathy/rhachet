import { given, then, useBeforeAll, when } from 'test-fns';
import { genTempDir } from 'test-fns';

import {
  enrollRealClaudeAndWaitReach,
  getRealClaudeOrThrow,
  sayAndPollForMarker,
  setupEnrollFixture,
  trustFolderForRealClaude,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import { asSnapshotSafe } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = the real-brain clamp for the BULK-write `say` path. the socket server writes
 *   the whole message in ONE pty write, then submits with a `\r` after a length-scaled
 *   submit delay (computeCloneSubmitDelay). this proves, against a REAL claude, that a
 *   booted claude accepts a bulk content write + a delayed submit — short AND long.
 * .why =
 *   - the OLD design typed one char at a time (8ms/char → ~30s for a long message) on the
 *     mistaken theory that a booted claude DISCARDS a bulk burst. a live probe
 *     (2026-08-13, lesson.clone-say-bulk-write-works) disproved it: the content burst is
 *     fine; only the SUBMIT raced the paste commit. bulk write + a length-scaled submit
 *     delay lands both short and long, ~30x faster for long.
 *   - the LONG (~3728-char) case is the one that matters: it is where char-at-a-time was
 *     slow and where an 8ms submit delay was too short (the paste needs ~1s to commit).
 *     this clamp goes red if the bulk path regresses to a fixed-tiny submit delay.
 */

const REACH_SENTINEL = 'RHACHET-BULK-OK';

// build a ~3760-char message that ENDS in the sentinel+nonce, so a landed reply proves
// the WHOLE bulk write (not just a truncated prefix) reached claude and submitted
const buildLongPrompt = (wanted: string): string => {
  const filler = 'the quick brown fox jumps over the lazy dog. '.repeat(80); // ~3600 chars
  return `Ignore the filler text below. ${filler} When you are done, reply with exactly this text and no other words: ${wanted}`;
};

describe('rhx clone say BULK-write probe vs a REAL claude (real acceptance)', () => {
  given('[case1] a real, authenticated claude, the bulk-write say path', () => {
    const scene = useBeforeAll(async () => {
      const { binDir } = getRealClaudeOrThrow();
      const dir = genTempDir({ slug: 'clone-bulk-probe' });
      setupEnrollFixture({ dir });
      trustFolderForRealClaude({ dir });
      const env = { PATH: `${binDir}:${process.env.PATH ?? ''}` };
      const enrolled = await enrollRealClaudeAndWaitReach({ dir, env });
      return { dir, env, ...enrolled };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] a SHORT message is bulk-dispatched', () => {
      const roundtrip = useBeforeAll(async () => {
        const nonce = `${Date.now().toString(36)}-short`;
        const wanted = `${REACH_SENTINEL} ${nonce}`;
        return sayAndPollForMarker({
          address: scene.address,
          what: `Reply with exactly this text and no other words: ${wanted}`,
          marker: wanted,
          dir: scene.dir,
          env: scene.env,
        });
      });

      then('the say is accepted (exit 0)', () => {
        expect(roundtrip.said.status).toEqual(0);
      });
      then('the short bulk message landed + was replied', () => {
        expect(roundtrip.landed).toBe(true);
      });

      then('the say-delivered tree (human) is locked — brain-independent, so snapshot-safe', () => {
        // the say output is a plain `delivered` tree with NO brain prose in it, so it is
        // fully deterministic — the shape is identical for a short or long bulk write, so
        // one snapshot locks the bulk-path output against a dropped `delivered` line
        expect(asSnapshotSafe(roundtrip.said.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] a LONG (~3760-char) message is bulk-dispatched', () => {
      const roundtrip = useBeforeAll(async () => {
        const nonce = `${Date.now().toString(36)}-long`;
        const wanted = `${REACH_SENTINEL} ${nonce}`;
        const prompt = buildLongPrompt(wanted);
        // surface the true probe size in the run log
        // eslint-disable-next-line no-console
        console.log(`[bulk-probe] long prompt length = ${prompt.length} chars`);
        return sayAndPollForMarker({
          address: scene.address,
          what: prompt,
          marker: wanted,
          dir: scene.dir,
          env: scene.env,
          timeoutMs: 45000,
        });
      });

      then('the say is accepted (exit 0)', () => {
        expect(roundtrip.said.status).toEqual(0);
      });
      then('the LONG bulk message landed + was replied', () => {
        expect(roundtrip.landed).toBe(true);
      });
    });
  });
});
