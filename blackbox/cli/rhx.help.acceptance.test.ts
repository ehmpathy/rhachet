import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = acceptance tests for rhx help commands
 * .why = verifies rhx help, rhx --help, rhx -h emit correct treestruct
 */
describe('rhx help commands', () => {
  given('[case1] repo with skills', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-multi-skills' }),
    );

    when('[t0] rhx help is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['help'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows treestruct header', () => {
        expect(result.stdout).toContain('rhx');
      });

      then('shows skill command', () => {
        expect(result.stdout).toMatch(/\[skill\]/);
      });

      then('shows list command', () => {
        expect(result.stdout).toMatch(/list/);
      });

      then('output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] rhx --help is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['--help'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows same output as help', async () => {
        const helpResult = invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['help'],
          cwd: repo.path,
        });
        expect(result.stdout).toEqual(helpResult.stdout);
      });

      then('output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] rhx -h is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['-h'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows same output as help', async () => {
        const helpResult = invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['help'],
          cwd: repo.path,
        });
        expect(result.stdout).toEqual(helpResult.stdout);
      });

      then('output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] rhx --help with extra args is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['--help', 'garbage'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('still shows help output', async () => {
        const helpResult = invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['help'],
          cwd: repo.path,
        });
        expect(result.stdout).toEqual(helpResult.stdout);
      });

      then('output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
