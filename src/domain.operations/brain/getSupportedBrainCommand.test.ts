import { getError } from 'test-fns';

import { getSupportedBrainCommand } from './getSupportedBrainCommand';

const CASES = [
  { description: 'the short slug spawns claude', brain: 'claude' },
  { description: 'the claude-code slug spawns claude', brain: 'claude-code' },
  {
    description: 'the repl slug actors.yml documents spawns claude',
    brain: 'anthropic/claude/code',
  },
];

describe('getSupportedBrainCommand', () => {
  CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(getSupportedBrainCommand({ brain: thisCase.brain })).toEqual({
        command: 'claude',
        socket: true,
      });
    }),
  );

  test('an unsupported brain is refused, and names the supported set', async () => {
    const error = await getError(() =>
      getSupportedBrainCommand({ brain: 'codex' }),
    );
    expect(error.message).toContain("brain 'codex' not supported");
    expect(error.message).toContain('anthropic/claude/code');
  });
});
