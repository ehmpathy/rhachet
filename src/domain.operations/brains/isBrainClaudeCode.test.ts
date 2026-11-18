import { isBrainClaudeCode } from './isBrainClaudeCode';

const TEST_CASES = [
  {
    description: 'the full slug names claude code',
    given: { brain: 'anthropic/claude/code' },
    expect: true,
  },
  {
    description: 'the alias names claude code too, so it opens the same shield',
    given: { brain: 'claude-code' },
    expect: true,
  },
  {
    description: 'another brain does not',
    given: { brain: 'opencode/opencode' },
    expect: false,
  },
];

describe('isBrainClaudeCode', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isBrainClaudeCode(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
