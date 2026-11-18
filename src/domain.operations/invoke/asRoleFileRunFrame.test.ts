import { asRoleFileRunFrame } from './asRoleFileRunFrame';

const TEST_CASES = [
  {
    description: 'a skill reads as a solid skill run',
    given: {
      dir: 'skills',
      slugRepo: 'demo',
      slugRole: 'tester',
      slug: 'greet',
    },
    expect: '🪨 run solid skill repo=demo/role=tester/skill=greet',
  },
  {
    description: 'an init reads as a role init',
    given: {
      dir: 'inits',
      slugRepo: 'demo',
      slugRole: 'tester',
      slug: 'claude.hooks/pretooluse.guard',
    },
    expect:
      '💪 init role repo=demo/role=tester/init=claude.hooks/pretooluse.guard',
  },
] as const;

describe('asRoleFileRunFrame', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asRoleFileRunFrame({ ...thisCase.given })).toEqual(
        thisCase.expect,
      );
    }),
  );
});
