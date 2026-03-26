import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import type { ClaudeCodeSettings } from '@src/_topublish/rhachet-brains-anthropic/src/hooks/config.dao';
import { BrainCliEnrollmentManifest } from '@src/domain.objects/BrainCliEnrollmentManifest';

import { genBrainCliConfigArtifact } from './genBrainCliConfigArtifact';

describe('genBrainCliConfigArtifact', () => {
  /**
   * .what = creates a temp repo with .claude/settings.json
   * .why = isolated test environment
   */
  const createTestRepo = async (
    settings: ClaudeCodeSettings,
  ): Promise<string> => {
    const repoPath = path.join(
      os.tmpdir(),
      `test-repo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const claudeDir = path.join(repoPath, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify(settings, null, 2),
    );
    return repoPath;
  };

  given('[case1] repo with hooks from multiple roles', () => {
    const settingsWithHooks: ClaudeCodeSettings = {
      hooks: {
        SessionStart: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: 'echo mechanic boot',
                author: 'repo=ehmpathy/role=mechanic',
              },
              {
                type: 'command',
                command: 'echo driver boot',
                author: 'repo=ehmpathy/role=driver',
              },
              {
                type: 'command',
                command: 'echo ergonomist boot',
                author: 'repo=ehmpathy/role=ergonomist',
              },
            ],
          },
        ],
        PreToolUse: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: 'echo mechanic tool',
                author: 'repo=ehmpathy/role=mechanic',
              },
            ],
          },
        ],
      },
    };

    const scene = useBeforeAll(async () => {
      const repoPath = await createTestRepo(settingsWithHooks);
      return { repoPath };
    });

    when('[t0] enroll with only mechanic role', () => {
      const result = useBeforeAll(async () =>
        genBrainCliConfigArtifact({
          enrollment: new BrainCliEnrollmentManifest({
            brain: 'claude',
            roles: ['mechanic'],
          }),
          repoPath: scene.repoPath,
        }),
      );

      then('writes unique enrollment config', async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');
        expect(content).toBeDefined();
      });

      then('config path has unique hash (usecase.16)', () => {
        expect(result.configPath).toMatch(
          /settings\.enroll\.[a-f0-9]+\.local\.json$/,
        );
      });

      then('includes only mechanic hooks', async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');
        const settings = JSON.parse(content) as ClaudeCodeSettings;

        // should have 1 SessionStart entry with only mechanic's inner hook
        expect(settings.hooks?.SessionStart).toHaveLength(1);
        expect(settings.hooks?.SessionStart?.[0]?.hooks).toHaveLength(1);
        expect(
          (settings.hooks?.SessionStart?.[0]?.hooks?.[0] as { author?: string })
            ?.author,
        ).toContain('role=mechanic');

        // should have 1 PreToolUse entry with only mechanic's inner hook
        expect(settings.hooks?.PreToolUse).toHaveLength(1);
        expect(settings.hooks?.PreToolUse?.[0]?.hooks).toHaveLength(1);
        expect(
          (settings.hooks?.PreToolUse?.[0]?.hooks?.[0] as { author?: string })
            ?.author,
        ).toContain('role=mechanic');
      });

      then('excludes driver and ergonomist hooks', async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');

        expect(content).not.toContain('role=driver');
        expect(content).not.toContain('role=ergonomist');
      });
    });

    when('[t1] enroll with mechanic and ergonomist roles', () => {
      const result = useBeforeAll(async () =>
        genBrainCliConfigArtifact({
          enrollment: new BrainCliEnrollmentManifest({
            brain: 'claude',
            roles: ['mechanic', 'ergonomist'],
          }),
          repoPath: scene.repoPath,
        }),
      );

      then('includes mechanic and ergonomist hooks', async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');
        const settings = JSON.parse(content) as ClaudeCodeSettings;

        // hooks are grouped under a single matcher entry
        expect(settings.hooks?.SessionStart).toHaveLength(1);

        const innerHooks = settings.hooks?.SessionStart?.[0]?.hooks ?? [];
        expect(innerHooks).toHaveLength(2);

        const authors = innerHooks.map(
          (h) => (h as { author?: string }).author ?? '',
        );
        expect(authors.some((a) => a.includes('role=mechanic'))).toBe(true);
        expect(authors.some((a) => a.includes('role=ergonomist'))).toBe(true);
      });

      then('excludes driver hooks', async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');
        expect(content).not.toContain('role=driver');
      });
    });
  });

  given('[case2] repo with no hooks', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = await createTestRepo({});
      return { repoPath };
    });

    when('[t0] enroll with mechanic role', () => {
      const result = useBeforeAll(async () =>
        genBrainCliConfigArtifact({
          enrollment: new BrainCliEnrollmentManifest({
            brain: 'claude',
            roles: ['mechanic'],
          }),
          repoPath: scene.repoPath,
        }),
      );

      then('writes unique enrollment config', async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');
        expect(content).toBeDefined();
      });

      then('config has no hooks section', async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');
        const settings = JSON.parse(content) as ClaudeCodeSettings;
        expect(settings.hooks).toBeUndefined();
      });
    });
  });

  given('[case3] repo without .claude directory', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = path.join(os.tmpdir(), `test-repo-empty-${Date.now()}`);
      await fs.mkdir(repoPath, { recursive: true });
      return { repoPath };
    });

    when('[t0] enroll with mechanic role', () => {
      const result = useBeforeAll(async () =>
        genBrainCliConfigArtifact({
          enrollment: new BrainCliEnrollmentManifest({
            brain: 'claude',
            roles: ['mechanic'],
          }),
          repoPath: scene.repoPath,
        }),
      );

      then('creates .claude directory', async () => {
        const claudeDir = path.join(scene.repoPath, '.claude');
        const stat = await fs.stat(claudeDir);
        expect(stat.isDirectory()).toBe(true);
      });

      then('writes unique enrollment config', async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');
        expect(content).toBeDefined();
      });
    });
  });

  given('[case4] unsupported brain', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = await createTestRepo({});
      return { repoPath };
    });

    when('[t0] enroll with unsupported brain "openai"', () => {
      then('throws error', async () => {
        await expect(
          genBrainCliConfigArtifact({
            enrollment: new BrainCliEnrollmentManifest({
              brain: 'openai',
              roles: ['mechanic'],
            }),
            repoPath: scene.repoPath,
          }),
        ).rejects.toThrow("brain 'openai' not supported");
      });
    });
  });

  given('[case5] role with no hooks in config', () => {
    const settingsWithHooks: ClaudeCodeSettings = {
      hooks: {
        SessionStart: [
          {
            matcher: '# author=repo=ehmpathy/role=mechanic .*',
            hooks: [{ type: 'command', command: 'echo mechanic boot' }],
          },
        ],
      },
    };

    const scene = useBeforeAll(async () => {
      const repoPath = await createTestRepo(settingsWithHooks);
      return { repoPath };
    });

    when('[t0] enroll with architect role that has no hooks', () => {
      const result = useBeforeAll(async () =>
        genBrainCliConfigArtifact({
          enrollment: new BrainCliEnrollmentManifest({
            brain: 'claude',
            roles: ['architect'],
          }),
          repoPath: scene.repoPath,
        }),
      );

      then('writes unique enrollment config with empty hooks', async () => {
        const content = await fs.readFile(result.configPath, 'utf-8');
        const settings = JSON.parse(content) as ClaudeCodeSettings;
        expect(settings.hooks).toEqual({});
      });
    });
  });
});
