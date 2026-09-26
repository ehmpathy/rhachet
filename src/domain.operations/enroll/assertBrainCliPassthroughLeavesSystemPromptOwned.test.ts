import { ConstraintError } from 'helpful-errors';
import { getError } from 'test-fns';

import { assertBrainCliPassthroughLeavesSystemPromptOwned } from './assertBrainCliPassthroughLeavesSystemPromptOwned';

/**
 * .what = locks which passthrough tokens may and may not reach the brain cli beside
 *   rhachet's own `--system-prompt ''`
 * .why = the empty system prompt is the one boot slot every clone of an actor shares. a
 *   passthrough that replaced it would fork that slot in silence, so each replace form is
 *   refused and each additive form is allowed. DOGFOOD: drop a flag from the owned list, or
 *   drop the `=` inline match, and a row below goes red
 */
const REFUSED_CASES = [
  {
    description: 'the spaced --system-prompt form',
    passthrough: ['--system-prompt', 'you are a pirate'],
    overrides: ['--system-prompt'],
  },
  {
    description: 'the inline --system-prompt= form',
    passthrough: ['--system-prompt=you are a pirate'],
    overrides: ['--system-prompt=you are a pirate'],
  },
  {
    description: 'an empty --system-prompt (same value, still a second writer)',
    passthrough: ['--system-prompt', ''],
    overrides: ['--system-prompt'],
  },
  {
    description: 'the spaced --system-prompt-file form',
    passthrough: ['--system-prompt-file', './prompt.md'],
    overrides: ['--system-prompt-file'],
  },
  {
    description: 'the inline --system-prompt-file= form',
    passthrough: ['--system-prompt-file=./prompt.md'],
    overrides: ['--system-prompt-file=./prompt.md'],
  },
  {
    description: 'an override buried among other passthrough',
    passthrough: ['--model', 'haiku', '--system-prompt', 'x', '--verbose'],
    overrides: ['--system-prompt'],
  },
  {
    description: 'both owned flags at once — each is named',
    passthrough: ['--system-prompt', 'x', '--system-prompt-file', 'y'],
    overrides: ['--system-prompt', '--system-prompt-file'],
  },
];

const ALLOWED_CASES = [
  { description: 'no passthrough', passthrough: [] },
  {
    description: 'unrelated passthrough',
    passthrough: ['--model', 'haiku', '--dangerously-skip-permissions'],
  },
  {
    description: 'the additive --append-system-prompt',
    passthrough: ['--append-system-prompt', 'be brief'],
  },
  {
    description: 'the additive --append-system-prompt-file',
    passthrough: ['--append-system-prompt-file', './extra.md'],
  },
  {
    description: 'the phrase as a VALUE of another flag, never as a flag',
    passthrough: [
      '--append-system-prompt',
      '--system-prompt is owned by rhachet',
    ],
  },
];

describe('assertBrainCliPassthroughLeavesSystemPromptOwned', () => {
  REFUSED_CASES.map((thisCase) =>
    test(`refuses ${thisCase.description}`, async () => {
      const error = await getError(async () =>
        assertBrainCliPassthroughLeavesSystemPromptOwned({
          passthrough: thisCase.passthrough,
        }),
      );
      expect(error).toBeInstanceOf(ConstraintError);
      expect(error.message).toContain('enroll owns the system prompt');
      expect(error.message).toContain('--append-system-prompt');
      for (const override of thisCase.overrides)
        expect(error.message).toContain(override);
    }),
  );

  ALLOWED_CASES.map((thisCase) =>
    test(`allows ${thisCase.description}`, () => {
      expect(() =>
        assertBrainCliPassthroughLeavesSystemPromptOwned({
          passthrough: thisCase.passthrough,
        }),
      ).not.toThrow();
    }),
  );

  test('the refusal message is locked to a snapshot', async () => {
    const error = await getError(async () =>
      assertBrainCliPassthroughLeavesSystemPromptOwned({
        passthrough: [
          '--model',
          'haiku',
          '--system-prompt',
          'you are a pirate',
        ],
      }),
    );
    expect(error.message).toMatchSnapshot();
  });
});
