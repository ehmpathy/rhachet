import { asHookDispatchSwapLines } from './asHookDispatchSwapLines';

const genSwap = (
  input: Partial<
    Parameters<typeof asHookDispatchSwapLines>[0]['swaps'][number]
  >,
) => ({
  brain: 'claude-code',
  rules: 12,
  rulesByEvent: [
    { event: 'SessionStart', rules: 3 },
    { event: 'PreToolUse', rules: 7 },
    { event: 'UserPromptSubmit', rules: 1 },
    { event: 'Stop', rules: 1 },
  ],
  manifestPathRel: '.claude/hooks.dispatch.manifest',
  dispatchers: 4,
  dispatchersSet: 4,
  roleHooksTakenBack: 0,
  ...input,
});

const TEST_CASES = [
  {
    description: 'a first sync on a fresh repo names the shape it wrote',
    given: { swaps: [genSwap({})] },
  },
  {
    description: 'a migration names the role hooks that left the settings',
    given: { swaps: [genSwap({ roleHooksTakenBack: 16 })] },
  },
  {
    description: 'two brains each get a branch',
    given: {
      swaps: [
        genSwap({
          brain: 'claude-code',
          rules: 1,
          rulesByEvent: [{ event: 'PreToolUse', rules: 1 }],
          dispatchers: 1,
        }),
        genSwap({ brain: 'claude-code@actor', roleHooksTakenBack: 1 }),
      ],
    },
  },
];

describe('asHookDispatchSwapLines', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const lines = asHookDispatchSwapLines(thisCase.given);
      expect(lines[0]).toEqual('🪝 hook dispatchers set');
      expect(lines.join('\n')).toMatchSnapshot();
    }),
  );

  test('a re-sync with dispatchers in place and no role hook to move prints naught', () => {
    expect(
      asHookDispatchSwapLines({
        swaps: [genSwap({ dispatchersSet: 0, roleHooksTakenBack: 0 })],
      }),
    ).toEqual([]);
  });
});
