import { given, then, when } from 'test-fns';

import { isProcessReclaimedByRun } from './isProcessReclaimedByRun';

const TEST_CASES = [
  {
    description: 'a keyrack daemon, launched as an inline node source',
    command: "node -e require('rhachet/keyrack').startKeyrackDaemon({ socketPath })",
    expect: true,
  },
  {
    description: 'a brain stub',
    command: 'node /repo/src/.test/assets/stubBrainCli.cjs --settings x',
    expect: false,
  },
  {
    description: 'an enroll host',
    command: 'node /repo/bin/run.jit enroll claude',
    expect: false,
  },
  {
    description: 'an empty command',
    command: '',
    expect: false,
  },
];

describe('isProcessReclaimedByRun', () => {
  given('[case1] a process a run left alive', () => {
    TEST_CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then(`isProcessReclaimedByRun = ${thisCase.expect}`, () => {
          expect(isProcessReclaimedByRun({ command: thisCase.command })).toEqual(
            thisCase.expect,
          );
        });
      }),
    );
  });
});
