import { asCloneVerbAbsentHint } from './asCloneVerbAbsentHint';

const VERBS = ['list', 'say', 'get', 'whoami', 'prune'];

const TEST_CASES = [
  {
    description:
      'a brain on the clone verb names the inline form and the actor form',
    given: { operand: 'claude' },
    expect: {
      contains: [
        'rhx enroll <brain> --roles <roles>',
        'rhx clone @<slug>',
        '.agent/actors.yml',
        'list · say · get · whoami · prune',
      ],
      absent: ['did you mean'],
    },
  },
  {
    description: 'a typo of a verb names the nearest verb',
    given: { operand: 'lst' },
    expect: {
      contains: ["did you mean 'rhx clone list'?"],
      absent: [],
    },
  },
  {
    description: 'a clone address with no verb names the verb form',
    given: { operand: '@:peer1' },
    expect: {
      contains: ['to reach @:peer1, name a verb first: rhx clone get @:peer1'],
      absent: ['did you mean'],
    },
  },
  {
    description: 'a one-letter slip of a short verb still names it',
    given: { operand: 'sy' },
    expect: {
      contains: ["did you mean 'rhx clone say'?"],
      absent: [],
    },
  },
];

describe('asCloneVerbAbsentHint', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const hint = asCloneVerbAbsentHint({
        operand: thisCase.given.operand,
        verbs: VERBS,
      });
      for (const one of thisCase.expect.contains) expect(hint).toContain(one);
      for (const one of thisCase.expect.absent) expect(hint).not.toContain(one);
    }),
  );
});
