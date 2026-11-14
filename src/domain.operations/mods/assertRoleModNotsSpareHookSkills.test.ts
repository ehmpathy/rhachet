import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { assertRoleModNotsSpareHookSkills } from './assertRoleModNotsSpareHookSkills';

const NOTS = ['skills/wax.board.sh', 'briefs/rule.forbid.wipeouts.md'];

const TEST_CASES_CONFLICT = [
  {
    description: 'an rhx call by skill name',
    command: 'rhx wax.board --when hook.onStop',
  },
  {
    description: 'an npx rhx call by skill name',
    command: 'npx rhx wax.board',
  },
  {
    description: 'an npx rhachet run --skill call',
    command: 'npx rhachet run --skill wax.board',
  },
  {
    description: 'an rhx run --skill call',
    command: 'rhx run --skill wax.board --repo ehmpathy',
  },
  {
    description: 'a run --skill= call',
    command: './node_modules/.bin/rhachet run --skill=wax.board',
  },
  {
    description: 'a bash call by skill path',
    command: 'bash .agent/repo=ehmpathy/role=mechanic/skills/wax.board.sh',
  },
] as const;

const TEST_CASES_CLEAR = [
  { description: 'an rhx call of a kept skill', command: 'rhx paddle.out' },
  {
    description: 'a run --skill call of a kept skill',
    command: 'npx rhachet run --skill paddle.out',
  },
  { description: 'a bare binary', command: 'node ./dist/hook.js' },
  {
    description: 'a run --skill call pinned to another repo',
    command: 'rhx run --skill wax.board --repo bhrain',
  },
  {
    description: 'a run --skill call pinned to another role',
    command: 'rhx run --skill wax.board --role driver',
  },
  {
    description: "a bash call of another role's skill of the same name",
    command: 'bash .agent/repo=bhrain/role=driver/skills/wax.board.sh',
  },
] as const;

describe('assertRoleModNotsSpareHookSkills', () => {
  given('[case1] a not of a skill a hook invokes', () => {
    TEST_CASES_CONFLICT.map((thisCase) =>
      when(`[t0] the hook is ${thisCase.description}`, () => {
        then('it is refused, and the fix is to shadow', async () => {
          const error = await getError(async () =>
            assertRoleModNotsSpareHookSkills({
              ref: { repo: 'ehmpathy', role: 'mechanic' },
              nots: NOTS,
              hookCommands: [thisCase.command],
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('skills/wax.board.sh');
          expect(JSON.stringify(error)).toContain('shadow skills/wax.board.sh');
        });
      }),
    );
  });

  given('[case2] no hook reaches a not-ed skill', () => {
    TEST_CASES_CLEAR.map((thisCase) =>
      when(`[t0] the hook is ${thisCase.description}`, () => {
        then('it passes', () => {
          expect(() =>
            assertRoleModNotsSpareHookSkills({
              ref: { repo: 'ehmpathy', role: 'mechanic' },
              nots: NOTS,
              hookCommands: [thisCase.command],
            }),
          ).not.toThrow();
        });
      }),
    );
  });

  given('[case3] a mod that nots no skill', () => {
    when('[t0] a hook calls a skill by name', () => {
      then('it passes', () => {
        expect(() =>
          assertRoleModNotsSpareHookSkills({
            ref: { repo: 'ehmpathy', role: 'mechanic' },
            nots: ['briefs/rule.forbid.wipeouts.md'],
            hookCommands: ['rhx wax.board'],
          }),
        ).not.toThrow();
      });
    });
  });
});
