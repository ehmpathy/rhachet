import { given, then, useBeforeAll, when } from 'test-fns';

import { spawn } from 'node:child_process';
import type { BoxPressure } from './getOneBoxPressureNow';
import { asRunMinterMark, RUN_MINTER_ENV_KEY } from './getOneRunIdMintedHere';
import { ReporterAcceptanceBox } from './ReporterAcceptanceBox';

/**
 * .what = the inputs of a plain run: the real box, and no test results
 */
const RUN_PLAIN = { getOneBoxPressureNow: null, testResults: [] };

/**
 * .what = a run id no live run carries, so the sweep reads this test's children alone
 */
const RUN_ID_FAKE = 'r1c1c1c1c';

/**
 * .what = a second run id, as a peer suite on the same box would carry
 */
const RUN_ID_PEER = 'r2d2d2d2d';

/**
 * .what = spawn a parked node child under a run id
 * .note = `label` lands in the child's argv, so a test can make it look like a session daemon
 */
const spawnParked = (input: {
  label: string;
  runId: string;
}): { pid: number; end: () => void } => {
  const child = spawn(
    process.execPath,
    ['-e', `/* ${input.label} */ setInterval(() => undefined, 1000)`],
    {
      env: { ...process.env, TEST_FNS_RUN: input.runId },
      stdio: 'ignore',
    },
  );
  return { pid: child.pid!, end: () => child.kill('SIGKILL') };
};

/**
 * .what = whether a pid is still alive
 */
const isAlive = (input: { pid: number }): boolean => {
  try {
    process.kill(input.pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code === 'ESRCH') return false;
    throw error;
  }
};

/**
 * .what = run the reporter's run hooks under the fake run id, with stderr captured
 */
const runReporter = async (input: {
  getOneBoxPressureNow: (() => BoxPressure) | null;
  testResults: Array<{ testFilePath: string; failureMessage: string | null }>;
  mintedBy?: 'this-process' | 'a-parent-run';
}): Promise<{
  error: Error | undefined;
  stderr: string;
}> => {
  const runIdBefore = process.env.TEST_FNS_RUN;
  const minterBefore = process.env[RUN_MINTER_ENV_KEY];
  process.env.TEST_FNS_RUN = RUN_ID_FAKE;
  process.env[RUN_MINTER_ENV_KEY] = asRunMinterMark({
    pid: input.mintedBy === 'a-parent-run' ? process.ppid : process.pid,
    runId: RUN_ID_FAKE,
  });
  const writes: string[] = [];
  /**
   * .mock = process.stderr.write, as an output capture only
   * .why = the reporter's report is its output, and jest owns this process's stderr; no
   *   dependency is faked — the process scan (`ps`, `/proc`) and the kills run for real
   * .real = the same report reaches a human's terminal in every acceptance run, via
   *   `jest.acceptance.config.ts` reporters
   */
  const spy = jest
    .spyOn(process.stderr, 'write')
    .mockImplementation((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    });
  try {
    const reporter = new ReporterAcceptanceBox(null, {
      getOneBoxPressureNow: input.getOneBoxPressureNow ?? undefined,
    });
    reporter.onRunStart();
    await reporter.onRunComplete(null, { testResults: input.testResults });
    return { error: reporter.getLastError(), stderr: writes.join('') };
  } finally {
    spy.mockRestore();
    process.env.TEST_FNS_RUN = runIdBefore;
    if (minterBefore === undefined) delete process.env[RUN_MINTER_ENV_KEY];
    if (minterBefore !== undefined) process.env[RUN_MINTER_ENV_KEY] = minterBefore;
  }
};

describe('ReporterAcceptanceBox', () => {
  given('[case1] a run that left a brain stub alive', () => {
    const scene = useBeforeAll(async () => {
      const stub = spawnParked({ label: 'stubBrainCli', runId: RUN_ID_FAKE });
      await new Promise((wake) => setTimeout(wake, 300));
      const result = await runReporter(RUN_PLAIN);
      return { stub, ...result };
    });

    when('[t0] the run completes', () => {
      then('the run turns red', () => {
        expect(scene.error?.message).toContain('processes outlived this acceptance run');
      });

      then('the report names the leaked pid and the dir it ran in', () => {
        expect(scene.stderr).toContain(
          '✋ ConstraintError: 1 process outlived this acceptance run',
        );
        expect(scene.stderr).toContain(`pid ${scene.stub.pid}`);
      });

      then('the cwd is named where the host shows it, and claimed nowhere else', () => {
        // linux reads it from /proc; `ps` on macos shows none, so the report omits it
        if (process.platform === 'linux')
          expect(scene.stderr).toContain(`cwd = ${process.cwd()}`);
        if (process.platform !== 'linux') expect(scene.stderr).not.toContain('cwd =');
      });

      then('the leaked process was ended, so the box is clean', () => {
        expect(isAlive({ pid: scene.stub.pid })).toBe(false);
      });
    });
  });

  given('[case2] a run that left only a keyrack daemon alive', () => {
    const scene = useBeforeAll(async () => {
      const daemon = spawnParked({ label: 'startKeyrackDaemon', runId: RUN_ID_FAKE });
      await new Promise((wake) => setTimeout(wake, 300));
      const result = await runReporter(RUN_PLAIN);
      return { daemon, ...result };
    });

    when('[t0] the run completes', () => {
      then('the run stays green', () => {
        expect(scene.error).toBeUndefined();
      });

      then('the reclaim is noted', () => {
        expect(scene.stderr).toContain('ℹ reclaimed 1 keyrack daemon');
      });

      then('the daemon was ended', () => {
        expect(isAlive({ pid: scene.daemon.pid })).toBe(false);
      });
    });
  });

  given('[case3] a run that left no process alive', () => {
    const scene = useBeforeAll(async () => runReporter(RUN_PLAIN));

    when('[t0] the run completes', () => {
      then('the run stays green, and prints no leak or reclaim', () => {
        expect(scene.error).toBeUndefined();
        expect(scene.stderr).not.toContain('ConstraintError');
        expect(scene.stderr).not.toContain('reclaimed');
      });
    });
  });

  given('[case4] a peer suite on the same box, with a process of its own run alive', () => {
    const scene = useBeforeAll(async () => {
      const peer = spawnParked({ label: 'stubBrainCli', runId: RUN_ID_PEER });
      const stub = spawnParked({ label: 'stubBrainCli', runId: RUN_ID_FAKE });
      await new Promise((wake) => setTimeout(wake, 300));
      const result = await runReporter(RUN_PLAIN);
      const peerAliveAfter = isAlive({ pid: peer.pid });
      peer.end();
      return { peer, stub, peerAliveAfter, ...result };
    });

    when('[t0] this run completes', () => {
      then("the peer's process is untouched, since it carries no id of this run", () => {
        expect(scene.peerAliveAfter).toBe(true);
      });

      then("this run's own leak is still caught and ended", () => {
        expect(scene.stderr).toContain(`pid ${scene.stub.pid}`);
        expect(scene.stderr).not.toContain(`pid ${scene.peer.pid}`);
        expect(isAlive({ pid: scene.stub.pid })).toBe(false);
      });
    });
  });

  given('[case5] a test that timed out', () => {
    const testResults = [
      {
        testFilePath: `${process.cwd()}/blackbox/cli/enroll.acceptance.test.ts`,
        failureMessage: 'thrown: "Exceeded timeout of 90000 ms for a test."',
      },
    ];

    when('[t0] the box was starved through the run', () => {
      const scene = useBeforeAll(async () =>
        runReporter({
          getOneBoxPressureNow: () => ({ cpuPsiSomeAvg10: 80.7, load1: 55.7, cores: 12 }),
          testResults,
        }),
      );

      then('the starved note names the pressure and the scoped re-run', () => {
        expect(scene.stderr).toContain('ℹ a test timed out while the box was starved');
        expect(scene.stderr).toContain('peak cpu pressure = 81%');
        expect(scene.stderr).toContain(
          "rhx test.acceptance.credfree --scope 'blackbox/cli/enroll\\.acceptance\\.test\\.ts' --maxWorkers 1",
        );
      });
    });

    when('[t1] the box was quiet through the run', () => {
      const scene = useBeforeAll(async () =>
        runReporter({
          getOneBoxPressureNow: () => ({ cpuPsiSomeAvg10: 4, load1: 1.2, cores: 12 }),
          testResults,
        }),
      );

      then('no starved note prints, so the timeout reads as a plain red', () => {
        expect(scene.stderr).not.toContain('starved');
      });
    });
  });

  given('[case6] a run whose id was inherited from a parent run, never minted here', () => {
    // jest skips the globalSetup that mints the id when no test file matches, so such a run
    //   reads its parent's id; the parent's processes must survive it
    const scene = useBeforeAll(async () => {
      const parentChild = spawnParked({ label: 'stubBrainCli', runId: RUN_ID_FAKE });
      await new Promise((wake) => setTimeout(wake, 300));
      const result = await runReporter({ ...RUN_PLAIN, mintedBy: 'a-parent-run' });
      const aliveAfter = isAlive({ pid: parentChild.pid });
      parentChild.end();
      return { aliveAfter, ...result };
    });

    when('[t0] the run completes', () => {
      then("the parent run's process is untouched, and the run reads green", () => {
        expect(scene.aliveAfter).toBe(true);
        expect(scene.error).toBeUndefined();
        expect(scene.stderr).toEqual('');
      });
    });
  });
});
