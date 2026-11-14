import { given, then, when } from 'test-fns';

import { asRunTargetFromArgs } from './asRunTargetFromArgs';

const TEST_CASES = [
  {
    description: '[case1] a bare skill',
    args: ['--skill', 'rmsafe'],
    expect: { skill: 'rmsafe', init: null, repo: null, role: null },
  },
  {
    description:
      '[case2] a short -r after the skill name is the skill own (F26)',
    args: ['--skill', 'rmsafe', '-r', 'path/to/dir'],
    expect: { skill: 'rmsafe', init: null, repo: null, role: null },
  },
  {
    description: '[case3] a short -s after the skill name never replaces it',
    args: ['--skill', 'grepsafe', '-s', 'other'],
    expect: { skill: 'grepsafe', init: null, repo: null, role: null },
  },
  {
    description: '[case4] short flags before the name are run own',
    args: ['-r', 'any', '-s', 'say-hello'],
    expect: { skill: 'say-hello', init: null, repo: null, role: 'any' },
  },
  {
    description: '[case5] long --repo and --role after the name stay run own',
    args: ['--skill', 'deploy', '--repo', 'ehmpathy', '--role', 'mechanic'],
    expect: { skill: 'deploy', init: null, repo: 'ehmpathy', role: 'mechanic' },
  },
  {
    description: '[case6] the inline value form',
    args: ['--skill=wax.board', '--repo=beta'],
    expect: { skill: 'wax.board', init: null, repo: 'beta', role: null },
  },
  {
    description: '[case7] an init, with a short -i before the name',
    args: ['-i', 'init.claude', '-r', 'x'],
    expect: { skill: null, init: 'init.claude', repo: null, role: null },
  },
  {
    description: '[case8] no target named',
    args: ['--help'],
    expect: { skill: null, init: null, repo: null, role: null },
  },
];

describe('asRunTargetFromArgs', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      when('[t0] the args are read', () => {
        then('the target and filters are as expected', () => {
          expect(asRunTargetFromArgs({ args: thisCase.args })).toEqual(
            thisCase.expect,
          );
        });
      });
    }),
  );
});
