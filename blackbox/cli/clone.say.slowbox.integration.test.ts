import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import {
  enrollCloneAndWaitReady,
  setupEnrollFixture,
  setupRichStubBrainPath,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinaryAsync,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { genFakeSsOnPath } from '@src/.test/assets/genFakeSsOnPath';

/**
 * .what = the `ss -x` scan behind every clone socket's auth gate takes 7s
 * .why = 7s sits above both pre-#678 bounds (the 5s lookup kill, the 8s gate was the next to
 *   fall) and the 5s baseline probe, and below the say's 30s window
 */
const SS_DELAY_SECONDS = 7;

/**
 * .what = enroll a stub-brain clone whose socket server sees a 7s `ss`
 * .why = the clone's server inherits the PATH enroll is given. the fake `ss` is swapped in only
 *   long enough for the stub-brain PATH to be read from it, then the worker's own PATH is put
 *   back at once, so no other test in this worker meets the slow `ss`
 */
const genSlowBoxCloneScene = async (input: {
  slug: string;
  address: string;
  stubMode: string | null;
}): Promise<{
  dir: string;
  env: Record<string, string | undefined>;
  bg: Awaited<ReturnType<typeof enrollCloneAndWaitReady>>['bg'];
}> => {
  const dir = genTempDir({ slug: input.slug });
  const configDir = genTempDir({ slug: `${input.slug}-cfg` });
  setupEnrollFixture({ dir });

  // read the stub-brain PATH while the fake `ss` sits first on the worker PATH, then restore it
  const fakeSs = genFakeSsOnPath({
    delaySeconds: SS_DELAY_SECONDS,
    delayAt: 'before-scan',
    view: 'whole',
  });
  const stubPath = (() => {
    try {
      return setupRichStubBrainPath({ dir });
    } finally {
      fakeSs.restore();
    }
  })();

  const env = {
    PATH: stubPath,
    CLAUDE_CONFIG_DIR: configDir,
    ...(input.stubMode ? { RHACHET_STUB_MODE: input.stubMode } : {}),
  };
  const { bg } = await enrollCloneAndWaitReady({
    dir,
    env,
    as: input.address,
    timeoutMs: 60_000,
  });
  return { dir, env, bg };
};

/**
 * .what = `rhx clone say` on a loaded box to a clone that holds the message and writes no
 *   transcript — the `unreadable` failure a human reads, end to end through the cli
 * .why = the one loaded-box state a real brain cannot be held in on demand: a real claude
 *   writes its transcript on submit, so the "no rise within the bound" branch is reachable only
 *   with a brain told to hold (`RHACHET_STUB_MODE=busy`)
 * .note = an INTEGRATION test, by grain: the cli, the socket, the auth gate and the `ss` are real,
 *   and the brain is a stub (`rule.forbid.faked-or-quarantined-acceptance`). it reads the built
 *   cli (`dist/`), which the integration job builds first. the real-brain contract for the same
 *   journey — the say lands and the brain takes the turn, and another user's say is refused — is
 *   the acceptance gate's, in `clone.say.slowbox.realbrain.acceptance.test.ts`
 * .note = the one case here is `[case2]`, not `[case1]`: the loaded-box success case (`[case1]`)
 *   moved to the real-brain file, and `[case2]` keeps its number so the records that cite it hold
 */
describe('rhx clone say on a loaded box (integration, stub brain)', () => {
  given(
    '[case2] a busy clone on a box where `ss -x` takes 7s (no transcript rise, every probe blind)',
    () => {
      // RHACHET_STUB_MODE=busy → the stub holds the message and writes no transcript, so with
      //   every observe probe blind behind the slow gate no verdict but `unreadable` is reachable
      const scene = useBeforeAll(async () =>
        genSlowBoxCloneScene({
          slug: 'clone-slowbox-busy',
          address: '@:slowbusy',
          stubMode: 'busy',
        }),
      );
      afterAll(async () => scene?.bg?.kill());

      when('[t0] the human says a message to their own clone', () => {
        const said = useThen('the say returns', async () =>
          invokeRhachetCliBinaryAsync({
            args: ['clone', 'say', '@:slowbusy', '--what', 'hold-me-slowbox'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          }),
        );

        then('it exits 1 — a state to verify, never auth-denied', () => {
          expect(said.status).toEqual(1);
          expect(said.stderr).not.toContain('auth-denied');
        });

        then(
          'the hint forbids a blind re-send — the message was delivered — and names the wait',
          () => {
            expect(said.stderr).toContain('do NOT blind re-send');
            expect(said.stderr).toContain('wait for the load to ease');
            expect(said.stderr).not.toContain('re-enroll on a build');
          },
        );

        then('the failure a human reads on a loaded box is locked', () => {
          // trimmed: the frame's blank spacer lines are terminal layout, and the snapshot opens
          //   on the `💥` line the way its success peers open on their glyph line
          expect(asSnapshotSafe(said.stderr).trim()).toMatchSnapshot();
        });
      });

      when('[t1] the human reads the input box with `clone get --what buffer`', () => {
        // the surface read goes through getCloneInputStateOrBlind: the probe's 5s reply expires
        //   behind the 7s gate, and the read degrades to `probe-unanswered` rather than throws
        const got = useThen('the get returns', async () =>
          invokeRhachetCliBinaryAsync({
            args: ['clone', 'get', '@:slowbusy', '--what', 'buffer'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: true,
          }),
        );

        then('it exits 0 with the unreadable tree, never a throw', () => {
          expect(got.status).toEqual(0);
          expect(got.stdout).toContain('the buffer could not be read');
          expect(got.stdout).toContain('probe-unanswered');
          expect(got.stdout).toContain('wait for the load to ease');
          expect(got.stdout).not.toContain('re-enroll');
        });

        then('the tree a human reads on a loaded box is locked', () => {
          expect(asSnapshotSafe(got.stdout).trim()).toMatchSnapshot();
        });
      });

      when('[t2] a machine reads the input box with `clone get --what buffer --output json`', () => {
        const got = useThen('the get returns', async () =>
          invokeRhachetCliBinaryAsync({
            args: ['clone', 'get', '@:slowbusy', '--what', 'buffer', '--output', 'json'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: true,
          }),
        );

        then('it exits 0 and the record names the `probe-unanswered` reason', () => {
          expect(got.status).toEqual(0);
          expect(got.stdout).toContain('probe-unanswered');
        });

        then('the record a machine parses on a loaded box is locked', () => {
          expect(asSnapshotSafe(got.stdout).trim()).toMatchSnapshot();
        });
      });
    },
  );
});
