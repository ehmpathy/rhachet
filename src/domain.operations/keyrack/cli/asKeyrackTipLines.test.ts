import { given, then, when } from 'test-fns';

import { asKeyrackTipLines } from './asKeyrackTipLines';

const TEST_CASES = [
  {
    description: 'a tip with one branch',
    given: { tip: 'run rhx keyrack unlock --env test' },
    expect: {
      lines: ['   └─ \x1b[2mtip: run rhx keyrack unlock --env test\x1b[0m'],
    },
  },
  {
    description: 'a tip with three `;`-joined branches',
    given: { tip: 'no identity — fix: first; second; third' },
    expect: {
      lines: [
        '   └─ \x1b[2mtip: no identity — fix: first\x1b[0m',
        '      ├─ \x1b[2msecond\x1b[0m',
        '      └─ \x1b[2mthird\x1b[0m',
      ],
    },
  },
  {
    description: 'a `;` inside a backtick command stays whole',
    given: { tip: 'fix: run `a; b`; or else' },
    expect: {
      lines: [
        '   └─ \x1b[2mtip: fix: run `a; b`\x1b[0m',
        '      └─ \x1b[2mor else\x1b[0m',
      ],
    },
  },
  {
    description: 'blank branches are dropped',
    given: { tip: 'head;; ;tail' },
    expect: {
      lines: ['   └─ \x1b[2mtip: head\x1b[0m', '      └─ \x1b[2mtail\x1b[0m'],
    },
  },
];

describe('asKeyrackTipLines', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the tip is rendered', () => {
        then('it renders the expected lines', () => {
          const lines = asKeyrackTipLines({
            indent: '   ',
            tip: thisCase.given.tip,
          });
          expect(lines).toEqual(thisCase.expect.lines);
        });
      });
    }),
  );
});
