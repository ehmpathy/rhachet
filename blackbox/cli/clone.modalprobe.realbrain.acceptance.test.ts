import { ConstraintError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';
import { genTempDir } from 'test-fns';
import { getUuid } from 'uuid-fns';

import {
  enrollRealClaudeAndWaitReach,
  getRealClaudeOrThrow,
  sayAndPollForMarker,
  setupEnrollFixture,
  setRealClaudeFirstRunAccepted,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = the Q8 measurement (fulcrum F11), taken through the REAL product surface. F11
 *   claims the modal scan over-matches: a submitted turn or a numbered-list assistant reply
 *   rendered in the content region satisfies a MODAL_MARKER (`❯ N.`, `Do you want to`,
 *   `to confirm`), so a CLEAN idle box reads `modal` and every later `say` is withheld with
 *   `modal-holds-focus` — a clone gone permanently deaf, on unknowable screen history.
 * .why =
 *   - V12 mandates the realbrain measurement over testimony. F11's structural fix is a
 *     dedicated-PR dream, but the measurement itself was purely credential-gated: it needs a
 *     live claude that actually renders a numbered list and a real second dispatch that reads
 *     the resultant verdict off the shipped CLI. this test IS that measurement.
 *   - the read is end to end: dispatch a prompt whose reply IS a numbered list (the exact
 *     shape `MODAL_MARKERS` matches), land it, then dispatch a SECOND benign say into the now
 *     idle box and record the verdict the real surface returns. a `withheld`/`modal-holds-focus`
 *     verdict CONFIRMS the deaf-clone hazard; an `enqueued`/`released` verdict shows the
 *     over-match does not fire in practice (the reply scrolled out of the live viewport window,
 *     or the real render carries no marker shape).
 *   - credential-gated + costly, so it gates LOUD (a ConstraintError, exit 2) and NEVER skips,
 *     the same contract its peer realbrain clamps carry (`rule.forbid.faked-or-quarantined-acceptance`).
 */

// a real-brain tier needs a wall-clock far above the default: two cold-boot turns of real LLM
// latency plus two dispatches. the same 5-minute bound its peer realbrain clamps carry
jest.setTimeout(300000);

const REPLY_SENTINEL = 'RHACHET-MODAL-OK';

/**
 * .what = mask the live-volatile fields of a `clone say --output json` payload, so its
 *   ENVELOPE is snappable against a real brain
 * .why =
 *   - the verdict word is a READ OF BRAIN STATE — `released` and `enqueued` are both
 *     correct outcomes for this dispatch, and which one a live claude produces is a race
 *     against its own turn. so a raw snapshot pins a coin flip, the exact defect
 *     `asCloneSayHeadSnapshotSafe` exists to avoid one channel over
 *   - ⇒ and that masker cannot serve here: it takes a TREE head, and this journey reads
 *     the json channel deliberately — the measurement needs the machine `reason` field,
 *     which is the one surface that names `modal-holds-focus` unambiguously
 * .note = it masks the two DISCRIMINATORS (the verdict, the address identity) and keeps
 *   every other key verbatim, so a dropped field, a reordered key, or a changed `probe`
 *   default still shows in the diff a reviewer reads
 * .note = it THROWS on an unparseable payload rather than return a placeholder — a masker
 *   that snapped a garbled string would read as a pass (`rule.forbid.failhide`)
 */
const asCloneSayJsonSnapshotSafe = (input: {
  stdout: string;
  stderr: string;
}): string => {
  const parsed = ((): Record<string, unknown> => {
    try {
      return JSON.parse(input.stdout) as Record<string, unknown>;
    } catch {
      throw new ConstraintError(
        'clone say --output json stdout did not parse — no safe mask applies',
        { stdout: input.stdout, stderr: input.stderr },
      );
    }
  })();
  return JSON.stringify(
    {
      ...parsed,
      verdict: '<verdict>',
      serial: '<serial>',
      slug: '<slug>',
    },
    null,
    2,
  );
};

describe('rhx clone say modal-over-match probe vs a REAL claude (real acceptance)', () => {
  given('[case1] a real claude that just rendered a numbered-list reply', () => {
    const scene = useBeforeAll(async () => {
      const { binDir } = getRealClaudeOrThrow();
      const dir = genTempDir({ slug: 'clone-modalprobe' });
      setupEnrollFixture({ dir });
      setRealClaudeFirstRunAccepted({ dir });
      const env = { PATH: `${binDir}:${process.env.PATH ?? ''}` };
      const enrolled = await enrollRealClaudeAndWaitReach({ dir, env });
      return { dir, env, ...enrolled };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    // turn 1: make the brain print a NUMBERED LIST — the content shape F11 claims collides
    // with the modal markers. the prompt asks for a `1.`/`2.`/`3.` list plus the sentinel, so
    // the landed reply proves the list rendered on screen
    const firstTurn = useBeforeAll(async () => {
      const nonce = `${getUuid()}-list`;
      const wanted = `${REPLY_SENTINEL} ${nonce}`;
      return sayAndPollForMarker({
        address: scene.address,
        what: `Reply with a numbered list of three fruits (as "1. apple" etc), then on a new line exactly this text and no other words: ${wanted}`,
        marker: wanted,
        dir: scene.dir,
        env: scene.env,
        timeoutMs: 45000,
        getScreen: () => scene.bg.getOutput(),
      });
    });

    when('[t0] the numbered-list reply has landed', () => {
      then('the list reply landed (the collide-shape is on screen)', () => {
        expect(firstTurn.landed).toBe(true);
      });
    });

    // turn 2: dispatch a SECOND benign say into the now-idle box, read the verdict off the
    // shipped surface. THIS is the measurement — what the real product reports after a
    // numbered-list reply sits in history
    const secondSay = useBeforeAll(async () => {
      const said = invokeRhachetCliBinary({
        args: [
          'clone',
          'say',
          scene.address,
          '--what',
          'Reply with the single word: pong',
          '--output',
          'json',
        ],
        cwd: scene.dir,
        env: scene.env,
        logOnError: false,
      });
      // surface the raw verdict + the brain screen in the run log, so a human reads the
      // real measurement regardless of the assertion outcome
      // eslint-disable-next-line no-console
      console.log(
        [
          '[modalprobe] second-say status =',
          String(said.status),
          '\n[modalprobe] second-say stdout =',
          said.stdout,
          '\n[modalprobe] second-say stderr =',
          said.stderr,
          '\n[modalprobe] brain screen (last 3000) =',
          scene.bg.getOutput().slice(-3000),
        ].join(' '),
      );
      return said;
    });

    when('[t1] a second benign say is dispatched into the idle box', () => {
      then('it is NOT withheld as a false modal (F11 measured — the box reads clean)', () => {
        // the measurement's verdict: a second say into a genuinely clean box, after a
        // numbered-list reply, must NOT report the modal refusal. exit 2 with
        // `modal-holds-focus` would CONFIRM the F11 deaf-clone hazard fires in practice;
        // any non-modal verdict shows it does not
        const isModalRefusal =
          secondSay.status === 2 &&
          (secondSay.stdout.includes('modal-holds-focus') ||
            secondSay.stderr.includes('modal-holds-focus'));
        expect(isModalRefusal).toBe(false);
      });

      then('the verdict is one of the two SUCCESS words, and no other', () => {
        // sharper than the refusal check above, which a `buffered` or an `absent` would
        // also satisfy. the set is closed and it is small: a live dispatch into a clean
        // idle box either lands (`released`) or is held behind a turn (`enqueued`), and
        // every other word here names a defect this journey should redden on
        expect(secondSay.status).toEqual(0);
        const parsed = JSON.parse(secondSay.stdout) as { verdict: string };
        expect(['released', 'enqueued']).toContain(parsed.verdict);
      });

      then('the LIVE json envelope renders as snapped (masked vibecheck)', () => {
        // the vibecheck half the two asserts above cannot give: a reviewer reads the exact
        // machine payload a retry policy consumes off a LIVE brain, with no run of their
        // own — the same discipline every peer realbrain suite applies on the tree channel
        expect(
          asCloneSayJsonSnapshotSafe({
            stdout: secondSay.stdout,
            stderr: secondSay.stderr,
          }),
        ).toMatchSnapshot();
      });
    });
  });
});
