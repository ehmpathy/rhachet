import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { MalfunctionError } from 'helpful-errors';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  setupEnrollFixture,
  setupRichStubBrainPath,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import { getAllProcessesWithEnvMark } from '@/blackbox/.test/infra/getAllProcessesWithEnvMark';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import {
  type RhachetBackgroundHandle,
  spawnRhachetCliBackground,
} from '@/blackbox/.test/infra/spawnRhachetCliBackground';

/**
 * .what = blackbox acceptance that an enroll leaves no brain alive once it ends — however it ends
 * .why = brain stubs outlived their tests for hours and held a heap each (measured 2026-11-13:
 *   310 on one laptop, 18G). each way an enroll ends is driven here, and the box is read for any
 *   survivor
 *
 * .note = [case4] is the clamp: a detached clone whose exit say never ran is the path that
 *   leaked, and it goes red without the stub's hard cap. [case1]–[case3] are the attached ends:
 *   the kernel's hangup on a closed pty already ended the brain there before this change (a
 *   revert of the stub and harness fixes stays green), so they guard the property, not a fix
 * .note = [case5] is the clamp for prod's parent watch: a dead parent sends no hangup, and it
 *   goes red without the watch
 * .note = [case6] is the clamp for prod's hangup handler: a brain deaf to the hangup outlives a
 *   host that dies on the default SIGHUP action, and it goes red without the handler (measured
 *   2026-11-16)
 * .note = each spawn carries its own env mark, so the read finds this test's processes alone
 */
const MARK_KEY = 'RHACHET_TEST_ENROLL_MARK';

/**
 * .what = a short stub cap for the detached case, so the cap's effect lands inside one test
 */
const STUB_CAP_MS = 3000;

/**
 * .what = `execFile`, as a promise
 */
const execFileAsync = promisify(execFile);

/**
 * .what = enroll an attached stub clone through the outer pty, marked, and wait for its brain
 */
const spawnMarkedEnroll = async (input: {
  viaParent: boolean;
  envExtra: Record<string, string>;
}): Promise<{
  bg: RhachetBackgroundHandle;
  envMark: string;
}> => {
  const dir = genTempDir({ slug: 'enroll-ends-brain' });
  const configDir = genTempDir({ slug: 'enroll-ends-brain-cfg' });
  setupEnrollFixture({ dir });
  const stubPath = setupRichStubBrainPath({ dir });
  const mark = getUuid();
  const bg = spawnRhachetCliBackground({
    args: ['enroll', 'claude'],
    cwd: dir,
    env: { ...input.envExtra, PATH: stubPath, CLAUDE_CONFIG_DIR: configDir, [MARK_KEY]: mark },
    viaParent: input.viaParent,
  });
  await bg.waitForOutput({ pattern: /ready serial=/, timeoutMs: 20000 });
  return { bg, envMark: `${MARK_KEY}=${mark}` };
};

/**
 * .what = the parent pid of a process, as `ps` reports it (linux and macos alike)
 * .note = async, never `spawnSync`: a live background pty drains only while the event loop turns
 *   (`rule.forbid.sync-invoke-while-a-pty-is-live`)
 */
const getOneParentPid = async (input: { pid: number }): Promise<number> => {
  const listed = await execFileAsync('ps', ['-o', 'ppid=', '-p', String(input.pid)]).catch(
    (error: { stdout?: string; stderr?: string }) => ({
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
    }),
  );
  const ppid = Number(listed.stdout.trim());
  if (!Number.isInteger(ppid) || ppid <= 0)
    throw new MalfunctionError('no parent pid read from ps', {
      pid: input.pid,
      stdout: listed.stdout,
      stderr: listed.stderr,
      hint: 'the process left before its parent was read; check that ps is on PATH and the pid still lives',
    });
  return ppid;
};

/**
 * .what = the marked processes still alive once the bound has passed, or none sooner
 * .note = `isCounted` narrows the read to the processes a case grades, where a case's own
 *   scaffold (a shell that outlives the kill by design) carries the mark too
 */
const getAllSurvivorsAfter = async (input: {
  envMark: string;
  boundMs: number;
  pidsExcluded: number[];
  isCounted: ((proc: { pid: number; command: string }) => boolean) | null;
}): Promise<Array<{ pid: number; command: string }>> => {
  const deadline = Date.now() + input.boundMs;
  const isCounted = input.isCounted ?? ((): boolean => true);
  const read = async (): Promise<Array<{ pid: number; command: string }>> =>
    (
      await getAllProcessesWithEnvMark({
        envMark: input.envMark,
        pidsExcluded: input.pidsExcluded,
      })
    ).filter(isCounted);
  // .note = deliberate mutation — a bounded poll, local to this read
  let found = await read();
  while (found.length > 0 && Date.now() < deadline) {
    await new Promise((wake) => setTimeout(wake, 200));
    found = await read();
  }
  return found;
};

/**
 * .what = end each survivor, so a red case leaves the box clean for the next one
 */
const setSurvivorsEnded = (input: { survivors: Array<{ pid: number }> }): void =>
  input.survivors.forEach((proc) => {
    try {
      process.kill(proc.pid, 'SIGKILL');
    } catch (error) {
      if ((error as NodeJS.ErrnoException | null)?.code !== 'ESRCH') throw error;
    }
  });

describe('rhx enroll ends its brain (acceptance)', () => {
  given('[case1] an attached enroll, ended by its test teardown', () => {
    const scene = useBeforeAll(async () => spawnMarkedEnroll({ viaParent: false, envExtra: {} }));

    when('[t0] before the teardown', () => {
      then('the enroll and its brain are alive, under the mark', async () => {
        const found = await getAllProcessesWithEnvMark({
          envMark: scene.envMark,
          pidsExcluded: [],
        });
        expect(found.some((proc) => proc.command.includes('stubBrainCli'))).toBe(true);
      });
    });

    when('[t1] the harness kills the enroll', () => {
      const result = useBeforeAll(async () => {
        const killed = await scene.bg.kill();
        const survivors = await getAllSurvivorsAfter({
          envMark: scene.envMark,
          boundMs: 5000,
          pidsExcluded: [],
          isCounted: null,
        });
        setSurvivorsEnded({ survivors });
        return { killed, survivors };
      });

      then('the enroll exits', () => {
        expect(result.killed.exited).toBe(true);
      });

      then('no process under the mark is left alive', () => {
        expect(result.survivors).toEqual([]);
      });
    });
  });

  given('[case2] an attached enroll whose terminal hangs up', () => {
    const scene = useBeforeAll(async () => spawnMarkedEnroll({ viaParent: false, envExtra: {} }));
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the enroll process alone receives SIGHUP', () => {
      const result = useBeforeAll(async () => {
        process.kill(scene.bg.pid, 'SIGHUP');
        const survivors = await getAllSurvivorsAfter({
          envMark: scene.envMark,
          boundMs: 10000,
          pidsExcluded: [],
          isCounted: null,
        });
        setSurvivorsEnded({ survivors });
        return { survivors };
      });

      then('the brain ends with it, and no process under the mark is left', () => {
        expect(result.survivors).toEqual([]);
      });
    });
  });

  given('[case3] an attached enroll whose host dies abruptly', () => {
    const scene = useBeforeAll(async () => spawnMarkedEnroll({ viaParent: false, envExtra: {} }));
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the enroll process alone receives SIGKILL', () => {
      const result = useBeforeAll(async () => {
        process.kill(scene.bg.pid, 'SIGKILL');
        const survivors = await getAllSurvivorsAfter({
          envMark: scene.envMark,
          boundMs: 10000,
          pidsExcluded: [],
          isCounted: null,
        });
        setSurvivorsEnded({ survivors });
        return { survivors };
      });

      then('the brain ends on the loss of its terminal, and no process under the mark is left', () => {
        expect(result.survivors).toEqual([]);
      });
    });
  });

  /**
   * 🔴 the path that leaked. a no-tty enroll re-execs as a DETACHED host in its own session,
   *   designed to outlive its baker, so no hangup reaches it. its one teardown is a `say exit 0`
   *   from the test's afterAll — and an aborted or timed-out test never runs it. the host lived
   *   as long as its brain, and the brain parked forever. the stub's hard cap ends the brain,
   *   and the host ends with it
   *
   * .note = DOGFOOD, the mutation that makes it bite:
   *   | mutation | result |
   *   |---|---|
   *   | the stub's hard cap removed | 🔴 red — the host and the stub both survive the bound |
   */
  given('[case4] a detached enroll whose exit say never runs', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'enroll-ends-brain-detached' });
      const configDir = genTempDir({ slug: 'enroll-ends-brain-detached-cfg' });
      setupEnrollFixture({ dir });
      const mark = getUuid();
      const env = {
        PATH: setupRichStubBrainPath({ dir }),
        CLAUDE_CONFIG_DIR: configDir,
        RHACHET_STUB_BRAIN_MAX_MS: String(STUB_CAP_MS),
        [MARK_KEY]: mark,
      };
      const run = invokeRhachetCliBinary({
        args: ['enroll', 'claude', '--as', '@:forgotten', '--output', 'json'],
        cwd: dir,
        env,
        timeoutMs: 60_000,
        logOnError: false,
      });
      return { run, envMark: `${MARK_KEY}=${mark}` };
    });

    when('[t0] the enroll hands back an address and exits', () => {
      then('the enroll succeeds', () => {
        expect(scene.run.status).toEqual(0);
      });

      then('the detached brain is alive under the mark', async () => {
        const found = await getAllProcessesWithEnvMark({
          envMark: scene.envMark,
          pidsExcluded: [],
        });
        expect(found.some((proc) => proc.command.includes('stubBrainCli'))).toBe(true);
      });
    });

    when('[t1] no one says exit, and the cap passes', () => {
      const result = useBeforeAll(async () => {
        const survivors = await getAllSurvivorsAfter({
          envMark: scene.envMark,
          boundMs: STUB_CAP_MS + 10_000,
          pidsExcluded: [],
          isCounted: null,
        });
        setSurvivorsEnded({ survivors });
        return { survivors };
      });

      then('the brain and its detached host are both gone', () => {
        expect(result.survivors).toEqual([]);
      });
    });
  });

  /**
   * the parent dies, the terminal stays. an enroll whose parent is SIGKILLed hears no hangup:
   *   the parent is not the session leader, so the kernel signals no one, and the pty stays
   *   open. only the host's watch on its own parent can notice
   *
   * .note = DOGFOOD, the mutation that makes it bite:
   *   | mutation | result |
   *   |---|---|
   *   | the ppid watch removed from `genPtyCloneHostFromProcess` | 🔴 red — enroll and its brain survive the bound |
   */
  given('[case5] an attached enroll whose parent is SIGKILLed, its terminal left open', () => {
    const scene = useBeforeAll(async () => {
      const marked = await spawnMarkedEnroll({ viaParent: true, envExtra: {} });
      // the brain's parent is the enroll host; the host's parent is the shell to kill
      const stub = (
        await getAllProcessesWithEnvMark({
          envMark: marked.envMark,
          pidsExcluded: [],
        })
      ).find((proc) => proc.command.includes('stubBrainCli'));
      if (!stub)
        throw new MalfunctionError('no brain stub found under the mark, after ready', {
          envMark: marked.envMark,
          hint: 'the enroll was ready, so its brain stub should carry the mark; read the enroll output for a spawn fault',
        });
      const enrollPid = await getOneParentPid({ pid: stub.pid });
      return { ...marked, enrollPid, parentPid: await getOneParentPid({ pid: enrollPid }) };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the parent of the enroll receives SIGKILL', () => {
      const result = useBeforeAll(async () => {
        process.kill(scene.parentPid, 'SIGKILL');
        const survivors = await getAllSurvivorsAfter({
          envMark: scene.envMark,
          boundMs: 10000,
          pidsExcluded: [scene.bg.pid],
          isCounted: (proc) =>
            proc.pid === scene.enrollPid || proc.command.includes('stubBrainCli'),
        });
        setSurvivorsEnded({ survivors });
        return { survivors };
      });

      then('the host was the shell child, not the session leader', () => {
        expect(scene.parentPid).not.toEqual(scene.bg.pid);
      });

      then('the enroll ends its brain, and neither is left', () => {
        expect(result.survivors).toEqual([]);
      });
    });
  });

  /**
   * a brain deaf to the hangup. it ignores SIGHUP and its dead input, so the kernel's hangup on
   *   the closed pty cannot end it; only the host's own SIGHUP handler, which forwards the hangup
   *   and then escalates to SIGKILL, can
   *
   * .note = DOGFOOD, the mutation that makes it bite:
   *   | mutation | result |
   *   |---|---|
   *   | `process.on('SIGHUP', …)` removed from `genPtyCloneHostFromProcess` | 🔴 red — the host dies at once on the default action, and the deaf brain outlives it |
   *   | the SIGKILL escalation removed from `genBrainCliPtyClone` | 🔴 red — the forwarded hangup is ignored, and the brain parks |
   */
  given('[case6] an attached enroll whose brain is deaf to the hangup', () => {
    const scene = useBeforeAll(async () =>
      spawnMarkedEnroll({ viaParent: false, envExtra: { RHACHET_STUB_BRAIN_DEAF: '1' } }),
    );
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the enroll process alone receives SIGHUP', () => {
      const result = useBeforeAll(async () => {
        process.kill(scene.bg.pid, 'SIGHUP');

        // the brain still lives a moment on, so the hangup alone did not end it
        await new Promise((wake) => setTimeout(wake, 1500));
        const brainsAfterHangup = (
          await getAllProcessesWithEnvMark({ envMark: scene.envMark, pidsExcluded: [] })
        ).filter((proc) => proc.command.includes('stubBrainCli'));

        // then the escalation ends it, inside its bound
        const survivors = await getAllSurvivorsAfter({
          envMark: scene.envMark,
          boundMs: 12000,
          pidsExcluded: [],
          isCounted: null,
        });
        setSurvivorsEnded({ survivors });
        return { brainsAfterHangup, survivors };
      });

      then('the brain outlives the hangup itself, so the escalation is what ends it', () => {
        expect(result.brainsAfterHangup.length).toBeGreaterThan(0);
      });

      then('the enroll escalates to SIGKILL, and no process under the mark is left', () => {
        expect(result.survivors).toEqual([]);
      });
    });
  });
});
