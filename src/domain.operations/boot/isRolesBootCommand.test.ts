import { given, then, when } from 'test-fns';

import { isRolesBootCommand } from './isRolesBootCommand';

const TEST_CASES = [
  // positive — a role boot, qualified by --role, that boot.md supersedes
  {
    description: 'a path to the rhachet bin',
    command: './node_modules/.bin/rhachet roles boot --role X',
    expected: true,
  },
  {
    description: 'rhachet via npx, with --repo and --role',
    command: 'npx rhachet roles boot --repo X --role Y',
    expected: true,
  },
  {
    description: 'rhachet with --if-present',
    command:
      './node_modules/.bin/rhachet roles boot --repo X --role Y --if-present',
    expected: true,
  },
  {
    description: 'a --role=<slug> form',
    command: 'rhachet roles boot --role=X',
    expected: true,
  },
  {
    description: 'extra whitespace between words',
    command: 'rhachet roles   boot --role X',
    expected: true,
  },
  {
    description: 'lead whitespace',
    command: '  npx rhachet roles boot --role X',
    expected: true,
  },
  {
    description: 'the rhx boot alias',
    command: 'rhx boot --repo .this --role any',
    expected: true,
  },
  {
    description: 'the rhachet boot alias',
    command: 'npx rhachet boot --role X',
    expected: true,
  },

  // negative — a custom --manifest boot, which boot.md never renders
  {
    description: 'a --manifest boot via the rhachet bin',
    command:
      './node_modules/.bin/rhachet roles boot --manifest .behavior/v1.x/boot.yml',
    expected: false,
  },
  {
    description: 'a --manifest=<path> boot via npx',
    command: 'npx rhachet roles boot --manifest=.route/v1.x/boot.yml',
    expected: false,
  },
  {
    description: 'a --manifest boot via the rhx boot alias',
    command: 'rhx boot --manifest .behavior/v1.x/boot.yml',
    expected: false,
  },

  // negative — a mention, a skill lookup, or another hook
  {
    description: 'the adhoc route.drive hook',
    command:
      './node_modules/.bin/rhachet run --repo bhrain --skill route.drive --when hook.onBoot',
    expected: false,
  },
  {
    description: 'an echo of the phrase',
    command: 'echo "roles boot --role X"',
    expected: false,
  },
  {
    description: 'an echo of the whole command',
    command: 'echo rhachet roles boot --role X',
    expected: false,
  },
  {
    description: 'a log of the whole command',
    command: 'log rhachet roles boot --role X',
    expected: false,
  },
  {
    description: 'an executable path that holds the phrase',
    command: './notes/roles boot.sh --role X',
    expected: false,
  },
  {
    description: 'rhx roles boot, a skill lookup',
    command: 'rhx roles boot --role X',
    expected: false,
  },

  // edge — unqualified, or near-miss spellings
  {
    description: 'a boot with no --role',
    command: 'rhachet roles boot',
    expected: false,
  },
  {
    description: 'a --roles flag is not --role',
    command: 'rhachet roles boot --roles X',
    expected: false,
  },
  {
    description: 'rolesboot as one word',
    command: 'rhachet rolesboot --role X',
    expected: false,
  },
  {
    description: 'roles-boot hyphenated',
    command: 'rhachet roles-boot --role X',
    expected: false,
  },
];

describe('isRolesBootCommand', () => {
  given('[case1] a set of hook commands', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then(`it yields ${thisCase.expected}`, () => {
          expect(isRolesBootCommand({ command: thisCase.command })).toEqual(
            thisCase.expected,
          );
        });
      }),
    );
  });
});
