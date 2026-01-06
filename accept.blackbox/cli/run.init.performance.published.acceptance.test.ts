import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';
import { measureAverageMs } from '@/accept.blackbox/.test/infra/measureAverageMs';
import { RUN_PERF_TEST } from '@/accept.blackbox/.test/infra/RUN_PERF_TEST';

/**
 * .what = path to the compiled rhachet CLI binary
 * .why = performance tests measure the bun-compiled dispatcher
 */
const RHACHET_BIN = resolve(__dirname, '../../bin/run');

describe('rhachet run --init performance (published)', () => {
  given.runIf(RUN_PERF_TEST)(
    '[case1] repo with published perf-role (requires link)',
    () => {
    const repo = useBeforeAll(async () => {
      const r = genTestTempRepo({ fixture: 'with-perf-test' });

      // link the perf-role to make it available
      invokeRhachetCliBinary({
        args: ['roles', 'link', '--repo', 'perf-repo', '--role', 'perf-role'],
        cwd: r.path,
      });

      return r;
    });

    when('[t0] run --init perf.init --repo perf-repo --role perf-role', () => {
      let avgMs: number;

      beforeAll(() => {
        avgMs = measureAverageMs({
          runs: 30,
          fn: () => {
            spawnSync(
              RHACHET_BIN,
              [
                'run',
                '--init',
                'perf.init',
                '--repo',
                'perf-repo',
                '--role',
                'perf-role',
              ],
              {
                cwd: repo.path,
                stdio: 'pipe',
              },
            );
          },
        });
      });

      then('total execution time averages under 300ms across 30 runs', () => {
        // 300ms accounts for: warm bun binary (~50ms) + CLI (~100ms) + init (~50ms) + variance (100ms)
        // actual warm-cache: ~69ms; threshold allows for cold cache + CI variance
        // published pattern has extra variance from symlink resolution
        // see: .agent/repo=.this/role=tuner/briefs/perf.run.init.md
        expect(avgMs).toBeLessThan(300);
      });
    });
    },
  );
});
