import { asBriefPathLessMin } from './asBriefPathLessMin';

const TEST_CASES = [
  {
    description: 'a minification names its brief',
    path: 'briefs/rule.require.surf-wax.md.min',
    expected: 'briefs/rule.require.surf-wax.md',
  },
  {
    description: 'a brief is itself',
    path: 'briefs/rule.require.surf-wax.md',
    expected: 'briefs/rule.require.surf-wax.md',
  },
  {
    description: 'a skill is itself',
    path: 'skills/wax.board.sh',
    expected: 'skills/wax.board.sh',
  },
];

describe('asBriefPathLessMin', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asBriefPathLessMin({ path: thisCase.path })).toEqual(
        thisCase.expected,
      );
    }),
  );
});
