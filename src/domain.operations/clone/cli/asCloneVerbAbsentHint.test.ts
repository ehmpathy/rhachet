import { asCloneVerbAbsentHint } from './asCloneVerbAbsentHint';

const VERBS = ['make', 'list', 'say', 'get', 'whoami', 'prune'];

const ROADS_EXPECTED = [
  'reach a clone: rhx clone list | say | get | whoami | prune',
  'spawn from a declared actor: rhx clone make @<slug> (declared in .agent/actors.yml)',
  'compose a one-off: rhx enroll <brain> --roles <roles>',
];

const TEST_CASES = [
  {
    description:
      'a brain on the clone verb names no near verb, and every road rides one per line',
    given: { operand: 'claude' },
    expect: {
      hint: 'name a clone verb, a declared actor, or compose a one-off via enroll',
    },
  },
  {
    description: 'a typo of a verb names the nearest verb',
    given: { operand: 'lst' },
    expect: { hint: "did you mean 'rhx clone list'?" },
  },
  {
    description: 'a clone address with no verb names the verb form',
    given: { operand: '@:peer1' },
    expect: {
      hint: 'to reach @:peer1, name a verb first: rhx clone get @:peer1',
    },
  },
  {
    description: 'a one-letter slip of a short verb still names it',
    given: { operand: 'sy' },
    expect: { hint: "did you mean 'rhx clone say'?" },
  },
];

describe('asCloneVerbAbsentHint', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const { hint, roads } = asCloneVerbAbsentHint({
        operand: thisCase.given.operand,
        verbs: VERBS,
      });
      expect(hint).toEqual(thisCase.expect.hint);
      expect(roads).toEqual(ROADS_EXPECTED);
    }),
  );
});
