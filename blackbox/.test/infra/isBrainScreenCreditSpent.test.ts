import { given, then, when } from 'test-fns';

import { isBrainScreenCreditSpent } from './isBrainScreenCreditSpent';

const TEST_CASES = [
  {
    description: 'the claude cli credit error, as it renders',
    text: 'API Error: 400 {"type":"error","error":{"message":"Your credit balance is too low to access the Anthropic API."}}',
    expected: true,
  },
  {
    description: 'the same cause in another case',
    text: 'Credit Balance Is Too Low',
    expected: true,
  },
  {
    description: 'the short form a ci log shows',
    text: 'Credit balance too low',
    expected: true,
  },
  { description: 'a healthy reply', text: '⏺ PONG', expected: false },
  { description: 'an empty screen', text: '', expected: false },
];

describe('isBrainScreenCreditSpent', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the screen is read', () => {
        then(`it reads ${String(thisCase.expected)}`, () => {
          expect(isBrainScreenCreditSpent({ text: thisCase.text })).toEqual(thisCase.expected);
        });
      });
    }),
  );
});
