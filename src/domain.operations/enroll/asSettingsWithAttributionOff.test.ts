import { given, then, when } from 'test-fns';

import type { ClaudeCodeSettings } from '@src/domain.operations/brains/claudeCodeSettings';

import { asSettingsWithAttributionOff } from './asSettingsWithAttributionOff';

const TEST_CASES: Array<{
  description: string;
  given: { settings: ClaudeCodeSettings };
  expect: { settings: ClaudeCodeSettings };
}> = [
  {
    description: 'an absent attribution is set off',
    given: { settings: { model: 'haiku' } },
    expect: {
      settings: { model: 'haiku', attribution: { commit: '', pr: '' } },
    },
  },
  {
    description: 'a custom text is emptied, and another subkey is kept',
    given: {
      settings: {
        attribution: {
          commit: 'Co-Authored-By: Claude <noreply@anthropic.com>',
          pr: '🤖 Generated with Claude Code',
          sessionUrl: false,
        },
      },
    },
    expect: {
      settings: { attribution: { commit: '', pr: '', sessionUrl: false } },
    },
  },
  {
    description: 'a boolean attribution is replaced by the object form',
    given: { settings: { attribution: true } },
    expect: { settings: { attribution: { commit: '', pr: '' } } },
  },
  {
    description: 'an attribution already off is unchanged',
    given: { settings: { attribution: { commit: '', pr: '' } } },
    expect: { settings: { attribution: { commit: '', pr: '' } } },
  },
  {
    description: 'every other key is kept as found',
    given: {
      settings: {
        permissions: { allow: ['Bash(npm run build)'] },
        env: { DEBUG: 'surf:*' },
        includeCoAuthoredBy: true,
      },
    },
    expect: {
      settings: {
        permissions: { allow: ['Bash(npm run build)'] },
        env: { DEBUG: 'surf:*' },
        includeCoAuthoredBy: true,
        attribution: { commit: '', pr: '' },
      },
    },
  },
];

describe('asSettingsWithAttributionOff', () => {
  given('[case1] a settings file, in any attribution shape', () => {
    when('[t0] attribution is set off', () => {
      TEST_CASES.map((thisCase) =>
        then(thisCase.description, () => {
          const output = asSettingsWithAttributionOff(thisCase.given);
          expect(output).toEqual(thisCase.expect.settings);
        }),
      );
    });
  });

  // a re-appended key would move bytes in a tracked file on each write
  given('[case2] an attribution key ahead of another key', () => {
    when('[t0] attribution is set off', () => {
      then('the attribution key keeps its position', () => {
        const output = asSettingsWithAttributionOff({
          settings: { attribution: { commit: 'x' }, model: 'haiku' },
        });
        expect(Object.keys(output)).toEqual(['attribution', 'model']);
      });
    });
  });
});
