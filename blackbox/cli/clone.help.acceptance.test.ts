import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = acceptance snapshots for the actor/clone sub-command `--help` surfaces
 * .why =
 *   - `--help` is the one place a human always looks; a thin or absent help is
 *     friction (rule.require.help-on-demand). this surface class already regressed
 *     once (an `enroll --help` bug caught only by review), and the actor/clone
 *     sub-commands had NO test at the level a human/CI actually invokes them
 *   - each case pairs a functional assertion (exit 0 + a key token) with a snapshot,
 *     so a silent drift in the help a human reads reddens a test — never a
 *     snapshot-only failhide
 */
describe('rhx actor/clone --help (acceptance)', () => {
  given('[case1] a repo where the commands are registered', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-multi-skills' }),
    );

    const HELP_CASES = [
      { label: '[t0] actor --help', args: ['actor', '--help'], must: 'list' },
      {
        label: '[t1] actor list --help',
        args: ['actor', 'list', '--help'],
        must: 'actor',
      },
      { label: '[t2] clone --help', args: ['clone', '--help'], must: 'list' },
      {
        label: '[t3] clone list --help',
        args: ['clone', 'list', '--help'],
        must: 'clone',
      },
      {
        label: '[t4] clone say --help',
        args: ['clone', 'say', '--help'],
        must: '--what',
      },
      {
        label: '[t5] clone get --help',
        args: ['clone', 'get', '--help'],
        must: '--tail',
      },
      {
        label: '[t6] clone whoami --help',
        args: ['clone', 'whoami', '--help'],
        must: 'whoami',
      },
      {
        label: '[t7] clone prune --help',
        args: ['clone', 'prune', '--help'],
        must: '--older-than',
      },
    ] as const;

    HELP_CASES.forEach((thisCase) => {
      when(thisCase.label, () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            // default binary = bin/run (the local build with actor/clone); `rhx`
            // would hit bin/rhx, which lacks these unreleased commands
            args: [...thisCase.args],
            cwd: repo.path,
            logOnError: false,
          }),
        );

        then('exits 0 and names its own command/flags', () => {
          expect(result.status).toEqual(0);
          expect(result.stdout).toContain(thisCase.must);
        });

        then('the help text is locked (visual spot-check)', () => {
          expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
        });
      });
    });
  });
});
