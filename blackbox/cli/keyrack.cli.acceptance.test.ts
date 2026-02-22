import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack cli', () => {
  /**
   * test case: rhx keyrack short-circuit
   * verifies bin/rhx routes keyrack commands directly to rhachet keyrack
   */
  given('[case1] repo with keyrack manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack list', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'list'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );
      const rhachetResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('rhx exits with status 0', () => {
        expect(rhxResult.status).toEqual(0);
      });

      then('rhx output matches rhachet keyrack output', () => {
        expect(rhxResult.stdout).toEqual(rhachetResult.stdout);
      });

      then('rhx exit code matches rhachet keyrack exit code', () => {
        expect(rhxResult.status).toEqual(rhachetResult.status);
      });

      then('stdout matches snapshot', () => {
        expect(rhxResult.stdout).toMatchSnapshot();
      });
    });

    when('[t1] rhx keyrack list --json', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('rhx exits with status 0', () => {
        expect(rhxResult.status).toEqual(0);
      });

      then('rhx output is valid json', () => {
        expect(() => JSON.parse(rhxResult.stdout)).not.toThrow();
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(rhxResult.stdout);
        // redact timestamps for stable snapshots
        const snapped = Object.fromEntries(
          Object.entries(parsed).map(([k, v]: [string, any]) => [
            k,
            { ...(v as Record<string, unknown>), createdAt: '__TIMESTAMP__', updatedAt: '__TIMESTAMP__' },
          ]),
        );
        expect(snapped).toMatchSnapshot();
      });
    });
  });
});
