import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, readFileSync, readlinkSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const STUB_BRAIN = join(__dirname, '../../../.test/assets/stubBrainCli.cjs');

/**
 * .what = whether a pid no longer runs: absent from /proc, or a zombie
 * .why = a stub that exits under a live parent stays in /proc as a zombie (state `Z`) until
 *   that parent reaps it. it runs no code and holds no memory, so it counts as gone
 */
const isPidGone = (pid: number): boolean => {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    return stat.slice(stat.lastIndexOf(')') + 2).startsWith('Z');
  } catch {
    return true;
  }
};

/**
 * .what = poll until a pid is gone, or the bound runs out
 * .why = the stub's exit is asynchronous; a fixed sleep would flake
 */
const awaitPidGone = async (input: {
  pid: number;
  boundMs: number;
}): Promise<boolean> => {
  const deadline = Date.now() + input.boundMs;
  while (Date.now() < deadline) {
    if (isPidGone(input.pid)) return true;
    await new Promise((done) => setTimeout(done, 100));
  }
  return isPidGone(input.pid);
};

/**
 * .what = start the stub under a throwaway bash parent, in the leak shape, and await ready
 * .why = the leak shape is a stub whose stdin never ends: its stdin is the read end of a pipe
 *   whose write end a peer `sleep 30` holds, and the peer outlives the parent. (a pipe from
 *   this test would not do: node destroys a child's stdin stream the moment that child exits,
 *   so the stub would see EOF and leave of its own accord)
 * .note = the first stdout line is the stub pid; the stub's own `ready serial=` line proves it
 *   came up as a session (never an instant exit), so a check against it means aught
 */
const startStubUnderParent = async (input: {
  cwd: string;
}): Promise<{ parent: ChildProcess; stubPid: number }> => {
  const parent = spawn(
    'bash',
    [
      '-c',
      'exec 3< <(sleep 30); "$STUB_NODE" "$STUB_PATH" <&3 & echo "$!"; sleep 60',
    ],
    {
      cwd: input.cwd,
      stdio: ['ignore', 'pipe', 'inherit'],
      env: {
        ...process.env,
        STUB_NODE: process.execPath,
        STUB_PATH: STUB_BRAIN,
        CLAUDE_CONFIG_DIR: join(input.cwd, '.claude'),
      },
    },
  );
  const stubPid = await new Promise<number>((done, fail) => {
    let seen = '';
    const timer = setTimeout(
      () => fail(new Error(`stub never announced ready: ${seen}`)),
      5000,
    );
    parent.stdout!.on('data', (chunk: Buffer) => {
      seen += chunk.toString();
      if (!seen.includes('ready serial=')) return;
      clearTimeout(timer);
      done(Number(seen.split('\n')[0]!.trim()));
    });
    parent.once('error', fail);
  });
  return { parent, stubPid };
};

/**
 * .what = end the parent and the stub of one scene
 * .why = a red run must not become the leak it clamps: end this one stub, by its own pid
 */
const endScene = (input: { parent: ChildProcess; stubPid: number }): void => {
  if (input.parent.exitCode === null) input.parent.kill('SIGKILL');
  if (existsSync(`/proc/${input.stubPid}`))
    process.kill(input.stubPid, 'SIGKILL');
};

describe('stubBrainCli, on parent loss', () => {
  given('[case1] a stub whose stdin stays open after its parent dies', () => {
    const scene = useBeforeAll(async () =>
      startStubUnderParent({ cwd: genTempDir({ slug: 'stub-parent-loss' }) }),
    );
    afterAll(() => endScene(scene));

    when('[t0] the parent is killed', () => {
      then('the stub is alive while its parent lives', () => {
        expect(isPidGone(scene.stubPid)).toEqual(false);
      });

      then('the stub exits within 3s of its parent death', async () => {
        scene.parent.kill('SIGKILL');
        const gone = await awaitPidGone({ pid: scene.stubPid, boundMs: 3000 });
        expect(gone).toEqual(true);
      });
    });
  });

  given(
    '[case2] a stub whose parent lives on, and whose cwd is deleted',
    () => {
      // the measured leak: a detached enroll host outlives its test, so the stub's parent never
      //   dies; only the test repo's prune tells the stub it is unreachable
      const scene = useBeforeAll(async () => {
        const cwd = genTempDir({ slug: 'stub-cwd-loss' });
        return { cwd, ...(await startStubUnderParent({ cwd })) };
      });
      afterAll(() => endScene(scene));

      when('[t0] the cwd is removed', () => {
        then('the stub is alive while its cwd exists', () => {
          expect(isPidGone(scene.stubPid)).toEqual(false);
        });

        then('the stub exits within 3s of its cwd removal', async () => {
          // delete the stub's own cwd, read from /proc, as the prune deletes the test repo
          const stubCwd = readlinkSync(`/proc/${scene.stubPid}/cwd`);
          rmSync(stubCwd, { recursive: true, force: true });
          const gone = await awaitPidGone({
            pid: scene.stubPid,
            boundMs: 3000,
          });
          expect(gone).toEqual(true);
        });
      });
    },
  );
});
