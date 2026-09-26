import { given, then, when } from 'test-fns';

import { asBrainCliVersion } from './asBrainCliVersion';

const TEST_CASES = [
  {
    description: 'a bare triple',
    output: '2.1.277',
    expected: { major: 2, minor: 1, patch: 277 },
  },
  {
    description: 'the claude label after the triple',
    output: '2.1.277 (Claude Code)',
    expected: { major: 2, minor: 1, patch: 277 },
  },
  {
    description: 'text before the triple',
    output: 'claude version 2.1.277\n',
    expected: { major: 2, minor: 1, patch: 277 },
  },
  { description: 'no triple', output: 'command not found', expected: null },
  {
    description: 'a pre-release suffix',
    output: '2.1.277-beta',
    expected: null,
  },
  { description: 'a build suffix', output: '2.1.277+abc', expected: null },
];

describe('asBrainCliVersion', () => {
  given('[case1] a set of --version outputs', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then(`it parses to ${JSON.stringify(thisCase.expected)}`, () => {
          expect(asBrainCliVersion({ output: thisCase.output })).toEqual(
            thisCase.expected,
          );
        });
      }),
    );
  });
});
