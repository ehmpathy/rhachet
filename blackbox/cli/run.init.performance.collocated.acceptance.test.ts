import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { measureAverageMs } from '@/blackbox/.test/infra/measureAverageMs';
import { RUN_PERF_TEST } from '@/blackbox/.test/infra/RUN_PERF_TEST';

/**
 * .what = path to the compiled rhachet CLI binary
 * .why = performance tests measure the bun-compiled dispatcher
 */
const RHACHET_BIN = resolve(__dirname, '../../bin/run');

describe('rhachet run --init performance (collocated)', () => {
  given.runIf(RUN_PERF_TEST)(
    '[case1] repo with collocated perf-role (no link required)',
    () => {
      const repo = useBeforeAll(async () => {
        // collocated roles are already in .agent/ - no link step needed
        const r = genTestTempRepo({ fixture: 'with-perf-collocated' });
        return r;
      });

      when('[t0] run --init perf.init --repo .this --role perf-role', () => {
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
                  '.this',
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

        then('total execution time averages under 250ms across 30 runs', () => {
          // 250ms accounts for: warm bun binary (~50ms) + CLI (~100ms) + init (~50ms) + variance
          // actual warm-cache: ~69ms; threshold allows for cold cache + CI variance
          // see: .agent/repo=.this/role=any/briefs/perf.run.init.md
          expect(avgMs).toBeLessThan(250);
        });
      });
    },
  );
});
