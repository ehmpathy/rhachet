import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { MalfunctionError } from 'helpful-errors';

import {
  setupEnrollFixture,
  setupRichStubBrainPath,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import { getAllProcessesWithEnvMark } from '@/blackbox/.test/infra/getAllProcessesWithEnvMark';
import { getOneAcceptanceBox } from '@/blackbox/.test/infra/getOneAcceptanceBox';
import { spawnRhachetCliBackground } from '@/blackbox/.test/infra/spawnRhachetCliBackground';

import { availableParallelism, getPriority } from 'node:os';

/**
 * .what = blackbox acceptance that the suite runs at the priority its box calls for, down to the
 *   grandchildren its tests spawn through the cli
 * .why = the priority is set once, in globalSetup, before jest forks its workers. a worker, the
 *   cli a test spawns, and the brain that cli spawns must all inherit it, or a seat on a shared
 *   box loses its cores to the suite's children while the suite's own process yields
 */
const MARK_KEY = 'RHACHET_TEST_SHARES_BOX_MARK';

describe('the acceptance suite shares the box (acceptance)', () => {
  given('[case1] a test in this run that enrolls a brain through the cli', () => {
    const scene = useBeforeAll(async () => {
      // the priority this box calls for
      const box = getOneAcceptanceBox({ env: process.env, cores: availableParallelism() });

      // enroll a stub brain through the cli, marked so its processes can be found
      const dir = genTempDir({ slug: 'shares-the-box' });
      const configDir = genTempDir({ slug: 'shares-the-box-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const mark = getUuid();
      const bg = spawnRhachetCliBackground({
        args: ['enroll', 'claude'],
        cwd: dir,
        env: { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir, [MARK_KEY]: mark },
      });
      await bg.waitForOutput({ pattern: /ready serial=/, timeoutMs: 20000 });

      // the brain is the cli's own child, two hops below this test
      const brain = (
        await getAllProcessesWithEnvMark({
          envMark: `${MARK_KEY}=${mark}`,
          pidsExcluded: [],
        })
      ).find((proc) => proc.command.includes('stubBrainCli'));
      if (!brain)
        throw new MalfunctionError('no brain stub found under the mark, after ready', {
          mark,
          hint: 'the enroll was ready, so its brain stub should carry the mark; read the enroll output for a spawn fault',
        });

      return {
        bg,
        priorityFloor: box.niceTarget ?? 0,
        priorityOfTest: getPriority(),
        priorityOfCli: getPriority(bg.pid),
        priorityOfBrain: getPriority(brain.pid),
      };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the test reads its own priority', () => {
      then('it is at or below the priority its box calls for (nice 10 shared, as given on ci)', () => {
        expect(scene.priorityOfTest).toBeGreaterThanOrEqual(scene.priorityFloor);
      });
    });

    when('[t1] the test spawns the cli, and the cli spawns a brain', () => {
      then('the cli inherits the test priority', () => {
        expect(scene.priorityOfCli).toEqual(scene.priorityOfTest);
      });

      then('the brain inherits it too', () => {
        expect(scene.priorityOfBrain).toEqual(scene.priorityOfTest);
      });
    });
  });
});
