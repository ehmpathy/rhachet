import { asHookDispatchRepairLines } from './asHookDispatchRepairLines';

const TEST_CASES = [
  {
    description: 'one brain whose manifest held one corrupt row',
    given: {
      repairs: [
        {
          brain: 'claude-code',
          manifestPathRel: '.claude/hooks.dispatch.manifest',
          linesDropped: 1,
        },
      ],
    },
  },
  {
    description: 'two brains, each rewritten past corrupt rows',
    given: {
      repairs: [
        {
          brain: 'claude-code',
          manifestPathRel: '.claude/hooks.dispatch.manifest',
          linesDropped: 3,
        },
        {
          brain: 'claude-code@actor',
          manifestPathRel:
            '.agent/.actors/actor.via.slug=x/brain/.claude/hooks.dispatch.manifest',
          linesDropped: 1,
        },
      ],
    },
  },
];

describe('asHookDispatchRepairLines', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const lines = asHookDispatchRepairLines(thisCase.given);
      expect(lines[0]).toEqual(
        '🪝 hook dispatch manifest rewritten past corrupt rows',
      );
      expect(lines.join('\n')).toMatchSnapshot();
    }),
  );

  test('no repair prints naught', () => {
    expect(asHookDispatchRepairLines({ repairs: [] })).toEqual([]);
  });
});
