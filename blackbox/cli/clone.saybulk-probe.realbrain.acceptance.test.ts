import { given, then, useBeforeAll, when } from 'test-fns';
import { genTempDir } from 'test-fns';
import { getUuid } from 'uuid-fns';

import {
  asCloneSayHeadSnapshotSafe,
  enrollRealClaudeAndWaitReach,
  expectCloneSaySuccessTree,
  getRealClaudeOrThrow,
  sayAndPollForMarker,
  setupEnrollFixture,
  setRealClaudeFirstRunAccepted,
} from '@/blackbox/.test/infra/enrollCloneHarness';

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

// a real-brain tier needs a wall-clock far above the default: a cold claude boot plus a
// ~3760-char paste plus real LLM latency runs minutes on a 2-vCPU ci runner (it fits under
// the default on a dev box, which is exactly how a too-tight bound hides until ci). the same
// 5-minute bound its peer real-brain clamp (clone.joker.realbrain) already carries
jest.setTimeout(300000);

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
      setRealClaudeFirstRunAccepted({ dir });
      const env = { PATH: `${binDir}:${process.env.PATH ?? ''}` };
      const enrolled = await enrollRealClaudeAndWaitReach({ dir, env });
      return { dir, env, ...enrolled };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] a SHORT message is bulk-dispatched', () => {
      const roundtrip = useBeforeAll(async () => {
        const nonce = `${getUuid()}-short`;
        const wanted = `${REACH_SENTINEL} ${nonce}`;
        return sayAndPollForMarker({
          address: scene.address,
          what: `Reply with exactly this text and no other words: ${wanted}`,
          marker: wanted,
          dir: scene.dir,
          env: scene.env,
          getScreen: () => scene.bg.getOutput(),
        });
      });

      then('the say is accepted (exit 0)', () => {
        expect(roundtrip.said.status).toEqual(0);
      });
      then('the short bulk message landed + was replied', () => {
        expect(roundtrip.landed).toBe(true);
      });

      then('the say tree names a SUCCESS verdict, addressed to this clone', () => {
        // ⚠️ a FULL-stdout snapshot was tried here and went red on the enqueued branch: the
        // verdict READS brain state, so a dispatch that races the brain's own turn renders
        // `enqueued for` where an idle one renders `said to` — both exit 0, both correct, and
        // the two differ in LINE COUNT. ⇒ the 13 render shapes are locked deterministically
        // at the unit grain (computeCloneSayReport.test.ts); this asserts the live
        // branch-invariant properties
        expectCloneSaySuccessTree({
          stdout: roundtrip.said.stdout,
          serial: scene.serial,
        });
      });

      then('the LIVE say head renders as snapped (masked vibecheck)', () => {
        // the complement to the assertion above: a human who reviews this PR sees the shape
        // a live pty + socket + subprocess actually put on stdout. the masker's own guard is
        // what FAILS on a broken envelope; this diff is what shows a reviewer WHAT changed
        expect(
          asCloneSayHeadSnapshotSafe({ stdout: roundtrip.said.stdout }),
        ).toMatchSnapshot();
      });
    });

    when('[t1] a LONG (~3760-char) message is bulk-dispatched', () => {
      const roundtrip = useBeforeAll(async () => {
        const nonce = `${getUuid()}-long`;
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
          getScreen: () => scene.bg.getOutput(),
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
