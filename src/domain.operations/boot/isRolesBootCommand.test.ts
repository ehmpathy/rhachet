import { given, then, when } from 'test-fns';

import { isRolesBootCommand } from './isRolesBootCommand';

const TEST_CASES = [
  // positive — the rhachet executable runs roles boot
  {
    description: 'a path to the rhachet bin',
    command: './node_modules/.bin/rhachet roles boot --role X',
    expected: true,
  },
  {
    description: 'rhachet via npx',
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
    description: 'extra whitespace between words',
    command: 'rhachet roles   boot',
    expected: true,
  },
  {
    description: 'lead whitespace',
    command: '  npx rhachet roles boot',
    expected: true,
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
    command: 'echo "roles boot"',
    expected: false,
  },
  {
    description: 'an echo of the whole command',
    command: 'echo rhachet roles boot --done',
    expected: false,
  },
  {
    description: 'a log of the whole command',
    command: 'log rhachet roles boot',
    expected: false,
  },
  {
    description: 'an executable path that holds the phrase',
    command: './notes/roles boot.sh',
    expected: false,
  },
  {
    description: 'rhx roles boot, a skill lookup',
    command: 'rhx roles boot',
    expected: false,
  },

  // edge — near-miss spellings
  {
    description: 'rolesboot as one word',
    command: 'rhachet rolesboot',
    expected: false,
  },
  {
    description: 'roles-boot hyphenated',
    command: 'rhachet roles-boot',
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
