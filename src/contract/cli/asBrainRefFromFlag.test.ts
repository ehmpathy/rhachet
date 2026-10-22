import { getError } from 'test-fns';

import { asBrainRefFromFlag } from './asBrainRefFromFlag';

const BRAINS = [
  { repo: 'openai', slug: 'openai/codex' },
  { repo: 'anthropic', slug: 'claude/code/haiku' },
];

const TEST_CASES = [
  {
    description:
      'a slug that opens with its repo keeps the extant whole-value form',
    given: { flag: 'openai/codex' },
    expect: { output: { repo: 'openai', slug: 'openai/codex' } },
  },
  {
    description: 'a slug that does not open with its repo reads as repo/rest',
    given: { flag: 'anthropic/claude/code/haiku' },
    expect: { output: { repo: 'anthropic', slug: 'claude/code/haiku' } },
  },
  {
    description:
      'a value that names no available brain falls back to the extant form',
    given: { flag: 'nope/brain' },
    expect: { output: { repo: 'nope', slug: 'nope/brain' } },
  },
];

describe('asBrainRefFromFlag', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const output = asBrainRefFromFlag({
        flag: thisCase.given.flag,
        brains: BRAINS,
      });
      expect(output).toEqual(thisCase.expect.output);
    }),
  );

  test('a value with no slash is refused, with the expected format', () => {
    const error = getError(() =>
      asBrainRefFromFlag({ flag: 'codex', brains: BRAINS }),
    );
    expect(error.message).toContain('invalid brain format "codex"');
    expect(error.message).toContain('expected: repo/slug');
  });
});
