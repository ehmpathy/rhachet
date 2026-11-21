import { ConstraintError } from 'helpful-errors';
import { getError } from 'test-fns';

import { asTimeoutSecondsOfBrainHook } from './asTimeoutSecondsOfBrainHook';

const TEST_CASES = [
  { description: 'reads an iso string', timeout: 'PT30S', seconds: 30 },
  { description: 'reads an iso minute', timeout: 'PT2M', seconds: 120 },
  { description: 'reads an iso shape', timeout: { seconds: 65 }, seconds: 65 },
  { description: 'reads a short seconds form', timeout: '10s', seconds: 10 },
  { description: 'reads a short minutes form', timeout: '2m', seconds: 120 },
  { description: 'rounds a short ms form up', timeout: '1200ms', seconds: 2 },
  {
    description: 'never reads a sub-second timeout as 0',
    timeout: '200ms',
    seconds: 1,
  },
] as const;

describe('asTimeoutSecondsOfBrainHook', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(
        asTimeoutSecondsOfBrainHook({ timeout: thisCase.timeout as never }),
      ).toEqual(thisCase.seconds);
    }),
  );

  test('refuses a timeout that is no duration, with a hint', async () => {
    const error = await getError(async () =>
      asTimeoutSecondsOfBrainHook({ timeout: 'soon' as never }),
    );
    expect(error).toBeInstanceOf(ConstraintError);
    expect(error.message).toContain('not a duration');
  });
});
