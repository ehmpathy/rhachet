import { given, then, when } from 'test-fns';

import { asProcessesWithEnvMarkFromPsTables } from './asProcessesWithEnvMarkFromPsTables';

/**
 * .what = the macos sweep, read from tables shaped as darwin's `ps` prints them
 * .why = ci runs on linux, so the darwin path is proven here, on its parse, with no darwin host
 */
describe('asProcessesWithEnvMarkFromPsTables', () => {
  given('[case1] a darwin box with a keyrack daemon and a stub of this run, and a peer process', () => {
    const psTableWithEnv = [
      "  101 node -e require('rhachet/keyrack').startKeyrackDaemon({ socketPath }) TEST_FNS_RUN=r1c1c1c1c HOME=/Users/kai",
      '  102 node /repo/src/.test/assets/stubBrainCli.cjs --settings x TEST_FNS_RUN=r1c1c1c1c HOME=/Users/kai',
      '  103 node /repo/src/.test/assets/stubBrainCli.cjs --settings y TEST_FNS_RUN=r2d2d2d2d HOME=/Users/kai',
      '  104 node /repo/bin/run.jit enroll claude TEST_FNS_RUN=r1c1c1c1c',
    ].join('\n');
    const psTable = [
      "  101 node -e require('rhachet/keyrack').startKeyrackDaemon({ socketPath })",
      '  102 node /repo/src/.test/assets/stubBrainCli.cjs --settings x',
      '  103 node /repo/src/.test/assets/stubBrainCli.cjs --settings y',
    ].join('\n');

    when('[t0] the run id is the marker', () => {
      const found = asProcessesWithEnvMarkFromPsTables({
        psTableWithEnv,
        psTable,
        marker: 'TEST_FNS_RUN=r1c1c1c1c',
      });

      then("the daemon's whole command survives, so it reads as reclaimed, not leaked", () => {
        expect(found[0]?.command).toContain('startKeyrackDaemon');
        expect(found[0]?.command).not.toContain('TEST_FNS_RUN');
      });

      then("the peer run's process is absent, and a pid that exited between reads is skipped", () => {
        expect(found.map((proc) => proc.pid)).toEqual([101, 102]);
      });

      then('no cwd is claimed, since ps shows none', () => {
        expect(found.every((proc) => proc.cwd === null)).toBe(true);
      });
    });
  });
});
