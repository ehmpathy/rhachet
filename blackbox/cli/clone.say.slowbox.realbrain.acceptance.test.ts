import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import {
  enrollRealClaudeAndWaitReach,
  expectCloneSaySuccessTree,
  getRealClaudeOrThrow,
  setRealClaudeFirstRunAccepted,
  setupEnrollFixture,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinaryAsync,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { type FakeSsView, genFakeSsOnPath } from '@src/.test/assets/genFakeSsOnPath';

// a real-brain tier: a cold claude boot plus a 7s gate per socket call. the same 5-minute bound
// its peer real-brain suites carry
jest.setTimeout(300000);

/**
 * .what = the `ss -x` scan behind the clone's auth gate takes 7s
 * .why = above both pre-#678 bounds (the 5s lookup kill, the 8s gate) and below the say's 30s
 *   window
 */
const SS_DELAY_SECONDS = 7;

/**
 * .what = enroll a REAL claude whose socket server sees a fake `ss` through a named view
 * .why = the clone's server inherits the PATH enroll is given. the fake `ss` sits first on the
 *   worker PATH only long enough to compose the enroll PATH from it, then the worker PATH is put
 *   back, so no other test in this worker meets it
 * .note = CLAUDE_CONFIG_DIR is left as is: the real brain must find its real credentials
 */
const genRealClaudeOnFakeSsScene = async (input: {
  slug: string;
  ss: { delaySeconds: number; view: FakeSsView };
}): Promise<
  { dir: string; env: Record<string, string | undefined> } & Awaited<
    ReturnType<typeof enrollRealClaudeAndWaitReach>
  >
> => {
  // the loud gate — a ConstraintError (exit 2) when the real brain or its credentials are absent
  const { binDir } = getRealClaudeOrThrow();

  const dir = genTempDir({ slug: input.slug });
  setupEnrollFixture({ dir });
  setRealClaudeFirstRunAccepted({ dir });

  // compose the enroll PATH while the fake `ss` sits first on the worker PATH, then restore it
  const fakeSs = genFakeSsOnPath({
    delaySeconds: input.ss.delaySeconds,
    delayAt: 'before-scan',
    view: input.ss.view,
  });
  const env = (() => {
    try {
      return { PATH: `${binDir}:${process.env.PATH ?? ''}` };
    } finally {
      fakeSs.restore();
    }
  })();

  const enrolled = await enrollRealClaudeAndWaitReach({ dir, env });
  return { dir, env, ...enrolled };
};

/**
 * .what = `rhx clone say` to a REAL claude on a loaded box, and to a real claude whose caller is
 *   another uid — the real cli, a real enroll, the real auth gate, the real `ss` (slowed or
 *   rewritten by a fake on PATH), and a real brain behind the pty
 * .why = the two critipaths of ehmpathy/rhachet#678 against the real brain contract: a same-user
 *   say on a loaded box lands and the brain takes the turn; another user's say is refused before
 *   one byte reaches the brain. the one state a real brain cannot be held in on demand (no
 *   transcript rise) is proven at the integration grain, `clone.say.slowbox.integration.test.ts`
 */
describe('rhx clone say on a loaded box vs a REAL claude (real acceptance)', () => {
  given('[case1] a real claude on a box where `ss -x` takes 7s', () => {
    const scene = useBeforeAll(async () =>
      genRealClaudeOnFakeSsScene({
        slug: 'clone-slowbox-real',
        ss: { delaySeconds: SS_DELAY_SECONDS, view: 'whole' },
      }),
    );
    afterAll(async () => scene?.bg?.kill());

    when('[t0] the human says a message to their own clone', () => {
      // async, never sync — the live pty must drain while the say runs
      //   (rule.forbid.sync-invoke-while-a-pty-is-live)
      const said = useThen('the say returns', async () => {
        const startedAt = Date.now();
        const result = await invokeRhachetCliBinaryAsync({
          args: [
            'clone',
            'say',
            scene.address,
            '--what',
            'Reply with exactly the word SLOWBOX and no other words.',
          ],
          cwd: scene.dir,
          env: scene.env,
          logOnError: true,
        });
        return { ...result, elapsedMs: Date.now() - startedAt };
      });

      then('it exits 0 — the say landed, never refused as auth-denied', () => {
        expect(said.status).toEqual(0);
        expect(said.stderr).not.toContain('auth-denied');
      });

      then('the gate waited out the slow scan rather than cut it short', () => {
        expect(said.elapsedMs).toBeGreaterThanOrEqual(SS_DELAY_SECONDS * 1000);
      });

      then('the real brain took the turn — verified by its own transcript', () => {
        expectCloneSaySuccessTree({ stdout: said.stdout, serial: scene.serial });
        expect(said.stdout).toContain('screen probe unanswered (a loaded box)');
        expect(said.stdout).toContain('verified by transcript');
        expect(said.stdout).not.toContain('re-enroll');
      });

      then('the whole success tree a human reads on a loaded box is locked', () => {
        // the full stdout, tail and all: every probe is blind behind the 7s gate, so the verdict
        //   is the transcript's and the `screen probe unanswered` leaf is the one tail this
        //   scene can render. only the volatile serial is masked
        expect(asSnapshotSafe(said.stdout).trim()).toMatchSnapshot();
      });
    });
  });

  given('[case2] a real claude whose every caller reads as another uid', () => {
    // the `foreign` view shows every caller as held by a process no readable fd names — how a
    //   caller of another uid looks to a non-root clone, whose holder scan cannot read its fds
    const scene = useBeforeAll(async () =>
      genRealClaudeOnFakeSsScene({
        slug: 'clone-crossuser-real',
        ss: { delaySeconds: 0, view: 'foreign' },
      }),
    );
    afterAll(async () => scene?.bg?.kill());

    when('[t0] a say is dispatched to the clone', () => {
      const MARKER = 'CROSSUSER-NEVER-TYPED';
      const said = useThen('the say returns', async () =>
        invokeRhachetCliBinaryAsync({
          args: ['clone', 'say', scene.address, '--what', MARKER],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 1 — refused as auth-denied, a server-side refusal', () => {
        expect(said.status).toEqual(1);
        expect(said.stderr).toContain('auth-denied');
        expect(said.stderr).toContain('not the same unix user');
      });

      then('not one byte reached the brain — the marker never drew on its screen', () => {
        expect(scene.bg.getOutput()).not.toContain(MARKER);
      });

      then('the refusal a human reads is locked', () => {
        // trimmed: the frame's blank spacer lines are terminal layout, and the snapshot opens
        //   on the `💥` line the way the success head opens on its glyph line
        expect(asSnapshotSafe(said.stderr).trim()).toMatchSnapshot();
      });
    });

    when('[t1] the caller reads the input box with `clone get --what buffer`', () => {
      const got = useThen('the get returns', async () =>
        invokeRhachetCliBinaryAsync({
          args: ['clone', 'get', scene.address, '--what', 'buffer'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: true,
        }),
      );

      then('no row of the box reaches the caller — the read is refused, never made', () => {
        expect(got.stdout).toContain('the buffer could not be read');
        expect(got.stdout).not.toContain('holds');
        expect(got.stdout).not.toContain('the input box is clear');
      });

      then('the tree a refused caller reads is locked', () => {
        // .note = the cause this tree names is `peer-probe-blind`: the gate's deny arrives as a
        //   rejected ack, which the reply parse reads as an older daemon. the copy fix — name the
        //   deny — is ehmpathy/rhachet#704; this snapshot moves on purpose when it lands
        expect(asSnapshotSafe(got.stdout).trim()).toMatchSnapshot();
      });
    });
  });
});
