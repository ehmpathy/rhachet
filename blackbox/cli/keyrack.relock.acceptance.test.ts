import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = acceptance tests for `keyrack relock`
 * .why = relock's --env help text now advertises camp; prove the advertised env works,
 *        and pin a --help snapshot (relock had none) so future drift is caught in diffs
 */
describe('keyrack relock cli', () => {
  // kill any stale daemon to keep the relock result deterministic
  beforeAll(() => killKeyrackDaemonForTests());

  given('[case1] any repo', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack relock --help', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'relock', '--help'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows relock command description', () => {
        expect(result.stdout).toContain('relock');
      });

      then('help lists camp among the --env options', () => {
        expect(result.stdout).toContain('camp');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [case2] relock --env camp — the wish's new env
   * proves the camp env, now advertised in relock's help, is accepted by relock
   * (exit 0, no rejection) rather than rejected (positive journey)
   */
  given('[case2] repo with keyrack manifest, relock camp', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack relock --env camp (no camp keys in daemon)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'relock', '--env', 'camp'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0 (camp is accepted, not rejected)', () => {
        expect(result.status).toEqual(0);
      });

      then('output does not reject camp as an invalid env', () => {
        expect(result.stderr).not.toContain('invalid --env');
      });

      then('shows no keys to prune message', () => {
        expect(result.stdout.toLowerCase()).toContain('no keys to prune');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
