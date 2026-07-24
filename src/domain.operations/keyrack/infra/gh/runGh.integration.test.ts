import { given, then, useThen, when } from 'test-fns';

import { runGh } from './runGh';

/**
 * .what = integration test for the sole real i/o boundary to the `gh` cli
 * .why = runGh is the one communicator that actually shells out; every other
 *        infra/gh function is a pure transform over an injected GhRun. this test
 *        proves the real spawn boundary works — both a success and a failure path
 *
 * .note = hermetic: `gh --version` needs no auth and no network, so it verifies
 *         the real binary connection without external state
 * .note = if the `gh` cli is absent, these assertions fail loud (not skip) — an
 *         absent tool is an unacceptable environment, per fail-fast
 */
describe('runGh', () => {
  given('[case1] a known-good gh invocation (--version)', () => {
    when('[t0] the gh cli is run', () => {
      const result = useThen('it returns a result', () =>
        runGh({ args: ['--version'] }),
      );

      then('the exit status is 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout reports the gh version', () => {
        expect(result.stdout).toContain('gh version');
      });

      then('stderr is empty', () => {
        expect(result.stderr).toEqual('');
      });
    });
  });

  given('[case2] a known-bad gh invocation (unknown subcommand)', () => {
    when('[t0] the gh cli is run', () => {
      const result = useThen('it returns a result', () =>
        runGh({ args: ['this-is-not-a-real-subcommand'] }),
      );

      then('the exit status is non-zero', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr explains the failure', () => {
        expect(result.stderr.length).toBeGreaterThan(0);
      });
    });
  });
});
