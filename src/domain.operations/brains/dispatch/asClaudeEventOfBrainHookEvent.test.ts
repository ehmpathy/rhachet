import { MalfunctionError } from 'helpful-errors';
import { getError } from 'test-fns';

import type { BrainHookEvent } from '@src/domain.objects/BrainHookEvent';

import { asBrainHookEventOfClaudeEvent } from './asBrainHookEventOfClaudeEvent';
import { asClaudeEventOfBrainHookEvent } from './asClaudeEventOfBrainHookEvent';

const TEST_CASES: Array<{ hook: BrainHookEvent; claude: string }> = [
  { hook: 'onBoot', claude: 'SessionStart' },
  { hook: 'onTool', claude: 'PreToolUse' },
  { hook: 'onTalk', claude: 'UserPromptSubmit' },
  { hook: 'onStop', claude: 'Stop' },
];

describe('asClaudeEventOfBrainHookEvent', () => {
  TEST_CASES.map((thisCase) =>
    test(`maps ${thisCase.hook} to ${thisCase.claude}`, () => {
      expect(asClaudeEventOfBrainHookEvent({ event: thisCase.hook })).toEqual(
        thisCase.claude,
      );
    }),
  );

  test('refuses an event no claude event fits', async () => {
    const error = await getError(async () =>
      asClaudeEventOfBrainHookEvent({ event: 'onNever' as never }),
    );
    expect(error).toBeInstanceOf(MalfunctionError);
    expect(error.message).toContain('no claude event');
  });
});

describe('asBrainHookEventOfClaudeEvent', () => {
  TEST_CASES.map((thisCase) =>
    test(`reads ${thisCase.claude} back as ${thisCase.hook}`, () => {
      expect(asBrainHookEventOfClaudeEvent({ event: thisCase.claude })).toEqual(
        thisCase.hook,
      );
    }),
  );

  test('round trip: hook → claude → hook is the identity for every event', () => {
    TEST_CASES.map(({ hook }) =>
      expect(
        asBrainHookEventOfClaudeEvent({
          event: asClaudeEventOfBrainHookEvent({ event: hook }),
        }),
      ).toEqual(hook),
    );
  });

  test('refuses a claude event no hook event fits', async () => {
    const error = await getError(async () =>
      asBrainHookEventOfClaudeEvent({ event: 'PostToolUse' }),
    );
    expect(error).toBeInstanceOf(MalfunctionError);
    expect(error.message).toContain('no hook event');
  });
});
