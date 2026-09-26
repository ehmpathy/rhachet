import { given, then, when } from 'test-fns';

import { join } from 'node:path';
import { asClaudeProjectSlug } from './asClaudeProjectSlug';
import { getBrainTranscriptDir } from './getBrainTranscriptDir';

describe('getBrainTranscriptDir', () => {
  given('[case1] a claude brain', () => {
    when('[t0] the transcript dir is computed', () => {
      then('it is the projects dir of the given brain dir', () => {
        const result = getBrainTranscriptDir({
          brain: 'claude',
          brainDir: '/actors/a/brain/.claude',
          cwd: '/work/repo',
        });
        expect(result).toEqual(
          join(
            '/actors/a/brain/.claude',
            'projects',
            asClaudeProjectSlug({ cwd: '/work/repo' }),
          ),
        );
      });
    });
  });

  given('[case2] a claude brain while the parent env names another dir', () => {
    when('[t0] the transcript dir is computed', () => {
      then('it ignores the parent env', () => {
        const prior = process.env['CLAUDE_CONFIG_DIR'];
        process.env['CLAUDE_CONFIG_DIR'] = '/parent/config';
        const result = (() => {
          try {
            return getBrainTranscriptDir({
              brain: 'claude-code',
              brainDir: '/actors/b/brain/.claude',
              cwd: '/work/repo',
            });
          } finally {
            if (prior === undefined) delete process.env['CLAUDE_CONFIG_DIR'];
            if (prior !== undefined) process.env['CLAUDE_CONFIG_DIR'] = prior;
          }
        })();
        expect(result?.startsWith('/actors/b/brain/.claude/projects/')).toBe(
          true,
        );
      });
    });
  });

  given('[case3] a brain with no transcript adapter', () => {
    when('[t0] the transcript dir is computed', () => {
      then('it is null', () => {
        const result = getBrainTranscriptDir({
          brain: 'codex',
          brainDir: '/actors/c/brain/.claude',
          cwd: '/work/repo',
        });
        expect(result).toBeNull();
      });
    });
  });
});
