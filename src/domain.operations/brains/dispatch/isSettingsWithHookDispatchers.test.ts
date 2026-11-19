import type { ClaudeCodeSettings } from '@src/domain.operations/brains/claudeCodeSettings';

import { HOOK_DISPATCH } from './constants';
import { isSettingsWithHookDispatchers } from './isSettingsWithHookDispatchers';

const TEST_CASES: Array<{
  description: string;
  given: { settings: ClaudeCodeSettings };
  expect: { output: boolean };
}> = [
  {
    description: 'settings with no hooks hold no dispatcher',
    given: { settings: { model: 'demo-model' } },
    expect: { output: false },
  },
  {
    description: 'settings with per-rule role hooks hold no dispatcher',
    given: {
      settings: {
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'command',
                  command: 'bash .agent/repo=test/role=tester/inits/guard.sh',
                  author: 'repo=test/role=tester',
                },
              ],
            },
          ],
        },
      },
    },
    expect: { output: false },
  },
  {
    description:
      'settings with one dispatcher hook, beside a hand hook, hold one',
    given: {
      settings: {
        hooks: {
          Stop: [
            {
              matcher: '*',
              hooks: [
                { type: 'command', command: 'echo hand' },
                {
                  type: 'command',
                  command: `bash ${HOOK_DISPATCH.bin} demo.manifest Stop`,
                  author: HOOK_DISPATCH.author,
                },
              ],
            },
          ],
        },
      },
    },
    expect: { output: true },
  },
];

describe('isSettingsWithHookDispatchers', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isSettingsWithHookDispatchers(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
