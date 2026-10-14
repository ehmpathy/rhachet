import { given, then } from 'test-fns';

import { asTextWithLinesConverged } from './asTextWithLinesConverged';

const TEST_CASES = [
  {
    description: 'absent content gets the present lines, in order',
    given: { content: null, linesAbsent: ['x'], linesPresent: ['/*', '!/a'] },
    expect: '/*\n!/a\n',
  },
  {
    description: 'a converged file comes back byte for byte',
    given: {
      content: '/*\n!/a\n',
      linesAbsent: ['x'],
      linesPresent: ['/*', '!/a'],
    },
    expect: '/*\n!/a\n',
  },
  {
    description: 'a retired line is dropped and an absent line appended',
    given: {
      content: 'boot.md\n/*\n',
      linesAbsent: ['boot.md'],
      linesPresent: ['/*', '!/a'],
    },
    expect: '/*\n!/a\n',
  },
  {
    description: 'a last line with no newline gets one before the append',
    given: { content: 'keep', linesAbsent: [], linesPresent: ['add'] },
    expect: 'keep\nadd\n',
  },
  {
    description: 'a line not named in either list stays',
    given: {
      content: '# a human note\nboot.md\n',
      linesAbsent: ['boot.md'],
      linesPresent: ['/*'],
    },
    expect: '# a human note\n/*\n',
  },
];

describe('asTextWithLinesConverged', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then('the content matches', () => {
        expect(asTextWithLinesConverged(thisCase.given)).toEqual(
          thisCase.expect,
        );
      });
    }),
  );
});
