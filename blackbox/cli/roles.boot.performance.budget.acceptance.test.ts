import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { measureAverageMs } from '@/blackbox/.test/infra/measureAverageMs';

/**
 * .what = path to the compiled rhachet CLI binary
 * .why = performance tests measure the bun-compiled dispatcher
 */
const RHACHET_BIN = resolve(__dirname, '../../bin/run');

/**
 * .what = the latency bound a BUDGETED boot owes, and the one an UNBUDGETED boot keeps
 * .why = the tokenizer loads lazily on a declared `budget`, so only a boot that opts in pays for
 *        it. this suite clamps that claim.
 *
 * .note = baselines (`rhx perf.test --runs 10`): unbudgeted ~160ms, budgeted ~656ms; each
 *   bound sits at ~3.7x over its baseline, wide enough to hold on a loaded box, so the clamps
 *   run on every run and are never skipped
 * .note = every measured spawn asserts exit 0, so a boot that fails fast cannot pass as fast
 */
describe('rhachet roles boot performance (budget)', () => {
  given('[case1] a manifest that declares NO budget', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-manifest' }),
    );

    when('[t0] it is booted 30 times', () => {
      // one measurement, shared by the clamp; each spawn must succeed
      const measured = useThen('it measures', async () => ({
        avgMs: measureAverageMs({
          runs: 30,
          fn: () => {
            const result = spawnSync(
              RHACHET_BIN,
              ['roles', 'boot', '--what', '.behavior/v2026_09_17.demo/boot.yml'],
              { cwd: repo.path, stdio: 'pipe' },
            );
            expect(result.status).toEqual(0);
          },
        }),
      }));

      /**
       * .what = an unbudgeted boot stays under 600ms — it loads no tokenizer
       */
      then('it stays under its 600ms bound', () => {
        expect(measured.avgMs).toBeLessThan(600);
      });
    });
  });

  given('[case2] a role boot whose boot.yml DECLARES a budget', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-budget-under' }),
    );

    when('[t0] it is booted 30 times', () => {
      // one measurement, shared by the clamp; each spawn must succeed
      const measured = useThen('it measures', async () => ({
        avgMs: measureAverageMs({
          runs: 30,
          fn: () => {
            const result = spawnSync(
              RHACHET_BIN,
              ['roles', 'boot', '--repo', '.this', '--role', 'any'],
              { cwd: repo.path, stdio: 'pipe' },
            );
            expect(result.status).toEqual(0);
          },
        }),
      }));

      /**
       * .what = a budgeted boot stays under 2500ms — it builds one encoder per process
       */
      then('it stays under its own, larger 2500ms bound', () => {
        expect(measured.avgMs).toBeLessThan(2500);
      });
    });
  });
});
