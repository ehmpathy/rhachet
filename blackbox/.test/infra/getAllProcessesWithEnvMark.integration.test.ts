import { given, then, useBeforeAll, when } from 'test-fns';

import { spawn } from 'node:child_process';
import { getAllProcessesWithEnvMark } from './getAllProcessesWithEnvMark';

/**
 * .what = spawn a node child that parks, with the given run id in its env
 */
const spawnParked = (input: { runId: string }): { pid: number; end: () => void } => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => undefined, 1000)'], {
    env: { ...process.env, TEST_FNS_RUN: input.runId },
    stdio: 'ignore',
  });
  return { pid: child.pid!, end: () => child.kill('SIGKILL') };
};

describe('getAllProcessesWithEnvMark', () => {
  given('[case1] two parked children, one of this run and one of a peer run', () => {
    const scene = useBeforeAll(async () => {
      const ours = spawnParked({ runId: 'r0a0a0a0a' });
      const peer = spawnParked({ runId: 'r0b0b0b0b' });
      await new Promise((wake) => setTimeout(wake, 300));
      return { ours, peer };
    });
    afterAll(() => {
      scene.ours.end();
      scene.peer.end();
    });

    const envMark = 'TEST_FNS_RUN=r0a0a0a0a';

    when('[t0] the lookup runs for this run mark', () => {
      const result = useBeforeAll(async () => ({
        found: await getAllProcessesWithEnvMark({ envMark, pidsExcluded: [] }),
      }));

      then('it finds this run child', () => {
        expect(result.found.map((proc) => proc.pid)).toContain(scene.ours.pid);
      });

      then('it never finds the peer run child', () => {
        expect(result.found.map((proc) => proc.pid)).not.toContain(scene.peer.pid);
      });

      then('it names the command on one line', () => {
        const ours = result.found.find((proc) => proc.pid === scene.ours.pid);
        expect(ours?.command).toContain('setInterval');
        expect(ours?.command).not.toContain('\n');
      });

      then('it names the dir the child ran in, where the host shows one', () => {
        const ours = result.found.find((proc) => proc.pid === scene.ours.pid);
        expect(ours?.cwd).toEqual(process.platform === 'linux' ? process.cwd() : null);
      });
    });

    when('[t1] the lookup excludes a pid', () => {
      then('that pid is left out', async () => {
        const found = await getAllProcessesWithEnvMark({
          envMark,
          pidsExcluded: [scene.ours.pid],
        });
        expect(found.map((proc) => proc.pid)).not.toContain(scene.ours.pid);
      });
    });
  });
});
