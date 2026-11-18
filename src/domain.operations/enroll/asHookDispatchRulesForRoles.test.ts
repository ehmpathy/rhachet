import { ConstraintError } from 'helpful-errors';
import { getError } from 'test-fns';

import { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

import { asHookDispatchRulesForRoles } from './asHookDispatchRulesForRoles';

// a rule with sane defaults; each case overrides what it tests
const genRule = (input: Partial<HookDispatchRule>): HookDispatchRule =>
  new HookDispatchRule({
    event: 'PreToolUse',
    matcher: '*',
    timeoutSeconds: 30,
    author: 'repo=demo/role=tester',
    kind: 'foreign',
    path: '',
    frame: '',
    args: [],
    command: 'echo hi',
    when: null,
    ...input,
  });

const RULE_TESTER = genRule({
  author: 'repo=demo/role=tester',
  command: 'echo tester',
});
const RULE_TESTER_OPS = genRule({
  author: 'repo=demo/role=tester-ops',
  command: 'echo tester-ops',
});
const RULE_BUILDER = genRule({
  author: 'repo=other/role=builder',
  command: 'echo builder',
});
const RULE_NO_ROLE = genRule({
  author: 'rhachet/hooks.dispatch',
  command: 'echo no-role',
});
const RULES = [RULE_TESTER, RULE_TESTER_OPS, RULE_BUILDER, RULE_NO_ROLE];

const TEST_CASES = [
  {
    description: 'keeps the rules of one enrolled role',
    roles: ['tester'],
    expected: [RULE_TESTER],
  },
  {
    description: 'keeps the rules of many enrolled roles, in rule order',
    roles: ['builder', 'tester'],
    expected: [RULE_TESTER, RULE_BUILDER],
  },
  {
    description: 'a role never matches another it is a prefix of',
    roles: ['tester-ops'],
    expected: [RULE_TESTER_OPS],
  },
  {
    description: 'a role focus is stripped before the match',
    roles: ['tester::flow'],
    expected: [RULE_TESTER],
  },
  {
    description: 'no enrolled roles keep no rules',
    roles: [],
    expected: [],
  },
  {
    description: 'a role no rule names keeps no rules',
    roles: ['stranger'],
    expected: [],
  },
  {
    description: 'a rule whose author names no role is never kept',
    roles: ['hooks.dispatch', 'rhachet'],
    expected: [],
  },
] as const;

describe('asHookDispatchRulesForRoles', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const rules = asHookDispatchRulesForRoles({
        rules: RULES,
        roles: [...thisCase.roles],
      });
      expect(rules).toEqual(thisCase.expected);
    }),
  );

  test('yields no rules from no rules', () => {
    expect(
      asHookDispatchRulesForRoles({ rules: [], roles: ['tester'] }),
    ).toEqual([]);
  });

  test('does not mutate the input rules', () => {
    const rules = [...RULES];
    asHookDispatchRulesForRoles({ rules, roles: ['tester'] });
    expect(rules).toEqual(RULES);
  });

  test('refuses a role token with one colon, with a hint', async () => {
    const error = await getError(async () =>
      asHookDispatchRulesForRoles({ rules: RULES, roles: ['tester:flow'] }),
    );
    expect(error).toBeInstanceOf(ConstraintError);
    expect(error.message).toContain('one colon');
  });
});
