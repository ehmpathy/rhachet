import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genSampleHookDispatchRule } from '@src/.test/assets/genSampleHookDispatchRule';

import { asHookDispatchRulesForRoles } from './asHookDispatchRulesForRoles';

// a rule with sane defaults; each case overrides what it tests
const genRule = genSampleHookDispatchRule;

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
        isArmedByMods: false,
      });
      expect(rules).toEqual(thisCase.expected);
    }),
  );

  test('yields no rules from no rules', () => {
    expect(
      asHookDispatchRulesForRoles({
        rules: [],
        roles: ['tester'],
        isArmedByMods: false,
      }),
    ).toEqual([]);
  });

  test('does not mutate the input rules', () => {
    const rules = [...RULES];
    asHookDispatchRulesForRoles({
      rules,
      roles: ['tester'],
      isArmedByMods: false,
    });
    expect(rules).toEqual(RULES);
  });

  test('refuses a role token with one colon, with a hint', async () => {
    const error = await getError(async () =>
      asHookDispatchRulesForRoles({
        rules: RULES,
        roles: ['tester:flow'],
        isArmedByMods: false,
      }),
    );
    expect(error).toBeInstanceOf(ConstraintError);
    expect(error.message).toContain('one colon');
  });

  given(
    '[case1] the framework-owned stop sweep, carried by a `.this` role',
    () => {
      const RULE_SWEEP = genRule({
        event: 'Stop',
        author: 'repo=.this/role=any',
        command:
          './node_modules/.bin/rhachet roles cost --all --when hook.onStop',
      });
      const RULE_THIS_OTHER = genRule({
        author: 'repo=.this/role=any',
        command: 'echo this-any',
      });
      const RULES_WITH_SWEEP = [RULE_TESTER, RULE_SWEEP, RULE_THIS_OTHER];

      when(
        '[t0] the mods arm the sweep, and the actor holds no `.this` role',
        () => {
          then(
            '🔴 the sweep rides the actor anyway, and no other `.this` rule does',
            () => {
              expect(
                asHookDispatchRulesForRoles({
                  rules: RULES_WITH_SWEEP,
                  roles: ['tester'],
                  isArmedByMods: true,
                }),
              ).toEqual([RULE_TESTER, RULE_SWEEP]);
            },
          );
        },
      );

      when('[t1] no mod arms the sweep', () => {
        then('the sweep rides the holders of its carrier alone', () => {
          expect(
            asHookDispatchRulesForRoles({
              rules: RULES_WITH_SWEEP,
              roles: ['tester'],
              isArmedByMods: false,
            }),
          ).toEqual([RULE_TESTER]);
        });
      });
    },
  );

  given('[case2] a role that declares the sweep command by hand', () => {
    const RULE_FOREIGN_SWEEP = genRule({
      author: 'repo=demo/role=builder',
      command: 'npx rhachet roles cost --all --when hook.onStop',
    });

    when('[t0] the mods arm the sweep, and the actor lacks that role', () => {
      then(
        "the rule is narrowed as its role's own, never carried as the sweep",
        () => {
          expect(
            asHookDispatchRulesForRoles({
              rules: [RULE_FOREIGN_SWEEP],
              roles: ['tester'],
              isArmedByMods: true,
            }),
          ).toEqual([]);
        },
      );
    });
  });
});
