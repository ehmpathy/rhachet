import { given, then } from 'test-fns';

import { REPO_THIS_BUDGET_HOOK_ARGS } from '@src/domain.operations/brains/getAllRepoThisRolesWithHooks';

import { isHookOfRepoModSweep } from './isHookOfRepoModSweep';

/**
 * .what = the truth table of the test that keeps the stop sweep on every actor
 * .why = a false yes would hand a hand-declared hook to a clone that never held its role; a false
 *        no would leave a seat deaf to a mod fault at its stop
 */
const COMMAND_SWEEP = `npx rhachet ${REPO_THIS_BUDGET_HOOK_ARGS}`;

const TEST_CASES = [
  {
    description:
      'the sweep, by the .this carrier, armed by a mod: kept on every actor',
    given: {
      author: 'repo=.this/role=any',
      command: COMMAND_SWEEP,
      isArmedByMods: true,
    },
    expect: true,
  },
  {
    description:
      'the sweep under a bin prefix an adapter sets: still matched by its args',
    given: {
      author: 'repo=.this/role=any',
      command: `./node_modules/.bin/rhachet ${REPO_THIS_BUDGET_HOOK_ARGS}`,
      isArmedByMods: true,
    },
    expect: true,
  },
  {
    description: 'the sweep, no mod armed: narrowed as any other hook',
    given: {
      author: 'repo=.this/role=any',
      command: COMMAND_SWEEP,
      isArmedByMods: false,
    },
    expect: false,
  },
  {
    description:
      'the same command, declared by hand in another repo role: narrowed as its own',
    given: {
      author: 'repo=demo/role=surfer',
      command: COMMAND_SWEEP,
      isArmedByMods: true,
    },
    expect: false,
  },
  {
    description:
      'an author whose repo segment only starts with repo=.this: no match',
    given: {
      author: 'repo=.thisX/role=any',
      command: COMMAND_SWEEP,
      isArmedByMods: true,
    },
    expect: false,
  },
  {
    description: 'a role slug .this under another repo: no match',
    given: {
      author: 'repo=demo/role=.this',
      command: COMMAND_SWEEP,
      isArmedByMods: true,
    },
    expect: false,
  },
  {
    description: 'another .this hook, armed: not the sweep',
    given: {
      author: 'repo=.this/role=any',
      command: 'npx rhachet roles boot --repo .this --role any',
      isArmedByMods: true,
    },
    expect: false,
  },
];

describe('isHookOfRepoModSweep', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then(`it answers ${thisCase.expect}`, () => {
        expect(isHookOfRepoModSweep(thisCase.given)).toEqual(thisCase.expect);
      });
    }),
  );
});
