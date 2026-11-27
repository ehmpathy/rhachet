import { given, then, when } from 'test-fns';

import { asPsTableRows } from './asPsTableRows';

describe('asPsTableRows', () => {
  given('[case1] a ps table with a padded pid, a blank line, and a multi-word command', () => {
    when('[t0] the rows are read', () => {
      then('each row is its pid and the whole rest of its line', () => {
        expect(
          asPsTableRows({
            psTable: [
              '  101 node /repo/bin/run.jit enroll claude --as @:kai',
              '',
              '12345 node -e setInterval(() => undefined, 1000) TEST_FNS_RUN=r1c1c1c1c',
            ].join('\n'),
          }),
        ).toEqual([
          { pid: 101, rest: 'node /repo/bin/run.jit enroll claude --as @:kai' },
          {
            pid: 12345,
            rest: 'node -e setInterval(() => undefined, 1000) TEST_FNS_RUN=r1c1c1c1c',
          },
        ]);
      });
    });
  });
});
