import * as fs from 'fs/promises';
import { ConstraintError } from 'helpful-errors';
import * as path from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { readClaudeCodeSettings, writeClaudeCodeSettings } from './config.dao';

describe('config.dao', () => {
  describe('readClaudeCodeSettings', () => {
    given('[case1] empty repo (no .claude/settings.json)', () => {
      const repo = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'claude-config-read-empty' });
        await fs.mkdir(dir, { recursive: true });
        return { path: dir };
      });

      when('[t0] read is called', () => {
        const scene = useBeforeAll(async () => {
          const settings = await readClaudeCodeSettings({ from: repo.path });
          return { settings };
        });

        then('returns empty object', () => {
          expect(scene.settings).toEqual({});
        });
      });
    });

    given('[case2] repo with settings.json', () => {
      const repo = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'claude-config-read-legacy' });
        await fs.mkdir(path.join(dir, '.claude'), { recursive: true });
        await fs.writeFile(
          path.join(dir, '.claude', 'settings.json'),
          JSON.stringify({
            hooks: {
              SessionStart: [
                { matcher: '*', hooks: [{ type: 'command', command: 'echo' }] },
              ],
            },
            otherSetting: true,
          }),
          'utf-8',
        );
        return { path: dir };
      });

      when('[t0] read is called', () => {
        const scene = useBeforeAll(async () => {
          const settings = await readClaudeCodeSettings({ from: repo.path });
          return { settings };
        });

        then('returns parsed settings', () => {
          expect(scene.settings.hooks).toBeDefined();
          expect(scene.settings.hooks?.SessionStart).toHaveLength(1);
        });

        then('preserves other settings', () => {
          expect(scene.settings.otherSetting).toBe(true);
        });
      });
    });

    given(
      '[case3] both settings.of.repo.json and a legacy settings.json',
      () => {
        const repo = useBeforeAll(async () => {
          const dir = genTempDir({ slug: 'claude-config-read-both' });
          await fs.mkdir(path.join(dir, '.claude'), { recursive: true });
          await fs.writeFile(
            path.join(dir, '.claude', 'settings.of.repo.json'),
            JSON.stringify({ source: 'repo' }),
            'utf-8',
          );
          await fs.writeFile(
            path.join(dir, '.claude', 'settings.json'),
            JSON.stringify({ source: 'legacy' }),
            'utf-8',
          );
          return { path: dir };
        });

        when('[t0] read is called', () => {
          const scene = useBeforeAll(async () => ({
            settings: await readClaudeCodeSettings({ from: repo.path }),
          }));

          then('settings.of.repo.json wins', () => {
            expect(scene.settings.source).toEqual('repo');
          });
        });
      },
    );

    given('[case4] only a settings.json arrow to the grove', () => {
      const repo = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'claude-config-read-grove' });
        await fs.mkdir(path.join(dir, '.claude'), { recursive: true });
        const grovePath = path.join(dir, 'grove.settings.json');
        await fs.writeFile(grovePath, JSON.stringify({ source: 'grove' }));
        await fs.symlink(grovePath, path.join(dir, '.claude', 'settings.json'));
        return { path: dir };
      });

      when('[t0] read is called', () => {
        const scene = useBeforeAll(async () => ({
          settings: await readClaudeCodeSettings({ from: repo.path }),
        }));

        then('the grove is never read as repo settings', () => {
          expect(scene.settings).toEqual({});
        });
      });
    });

    given(
      '[case5] a settings.of.repo.json that exists but cannot be read',
      () => {
        const repo = useBeforeAll(async () => {
          const dir = genTempDir({ slug: 'claude-config-read-unreadable' });
          // a directory in the file's place: readFile faults EISDIR, not ENOENT
          await fs.mkdir(path.join(dir, '.claude', 'settings.of.repo.json'), {
            recursive: true,
          });
          return { path: dir };
        });

        when('[t0] read is called', () => {
          const scene = useBeforeAll(async () => ({
            error: await readClaudeCodeSettings({ from: repo.path }).then(
              () => null,
              (caught: unknown) => caught,
            ),
          }));

          then('the fault surfaces, never read as absent', () => {
            expect((scene.error as NodeJS.ErrnoException | null)?.code).toEqual(
              'EISDIR',
            );
          });
        });
      },
    );

    given('[case6] a settings.of.repo.json that holds invalid json', () => {
      const repo = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'claude-config-read-corrupt' });
        await fs.mkdir(path.join(dir, '.claude'), { recursive: true });
        await fs.writeFile(
          path.join(dir, '.claude', 'settings.of.repo.json'),
          '{ "hooks": ',
        );
        return { path: dir };
      });

      when('[t0] read is called', () => {
        const scene = useBeforeAll(async () => ({
          error: await readClaudeCodeSettings({ from: repo.path }).then(
            () => null,
            (caught: unknown) => caught,
          ),
        }));

        then('the fault is a ConstraintError, the human to fix', () => {
          expect(scene.error).toBeInstanceOf(ConstraintError);
        });

        then('the fault names the file and the fix', () => {
          const message = (scene.error as Error | null)?.message ?? '';
          expect(message).toContain('settings file is not valid json');
          expect(message).toContain(
            path.join(repo.path, '.claude', 'settings.of.repo.json'),
          );
          expect(message).toContain('fix the json');
        });
      });
    });
  });

  describe('writeClaudeCodeSettings', () => {
    given('[case1] empty repo', () => {
      const repo = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'claude-config-write-empty' });
        await fs.mkdir(dir, { recursive: true });
        return { path: dir };
      });

      when('[t0] write is called', () => {
        const scene = useBeforeAll(async () => {
          const settings = {
            hooks: {
              SessionStart: [
                {
                  matcher: '*',
                  hooks: [{ type: 'command', command: 'echo "test"' }],
                },
              ],
            },
          };
          await writeClaudeCodeSettings({ settings, to: repo.path });
          const content = await fs.readFile(
            path.join(repo.path, '.claude', 'settings.of.repo.json'),
            'utf-8',
          );
          return { content };
        });

        then('creates .claude directory', async () => {
          const stat = await fs.stat(path.join(repo.path, '.claude'));
          expect(stat.isDirectory()).toBe(true);
        });

        then('writes settings.of.repo.json', () => {
          expect(scene.content).toContain('SessionStart');
          expect(scene.content).toContain('echo');
          expect(scene.content).toContain('test');
        });

        then('formats json with indentation', () => {
          expect(scene.content).toContain('\n  ');
        });
      });
    });

    given('[case2] repo with prior settings', () => {
      const repo = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'claude-config-write-prior' });
        await fs.mkdir(path.join(dir, '.claude'), { recursive: true });
        await fs.writeFile(
          path.join(dir, '.claude', 'settings.of.repo.json'),
          JSON.stringify({ oldData: true }),
          'utf-8',
        );
        return { path: dir };
      });

      when('[t0] write is called with new settings', () => {
        const scene = useBeforeAll(async () => {
          const settings = { newData: 'value' };
          await writeClaudeCodeSettings({ settings, to: repo.path });
          const content = await fs.readFile(
            path.join(repo.path, '.claude', 'settings.of.repo.json'),
            'utf-8',
          );
          const entries = await fs.readdir(path.join(repo.path, '.claude'));
          return { content, entries };
        });

        then('overwrites prior file', () => {
          expect(scene.content).not.toContain('oldData');
          expect(scene.content).toContain('newData');
        });

        then('leaves no temp file behind', () => {
          expect(scene.entries).toEqual(['settings.of.repo.json']);
        });
      });
    });

    given('[case3] a settings.json arrow that points at a grove file', () => {
      const repo = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'claude-config-write-arrow' });
        await fs.mkdir(path.join(dir, '.claude'), { recursive: true });
        const grovePath = path.join(dir, 'grove.settings.json');
        await fs.writeFile(grovePath, '{"grove":true}\n', 'utf-8');
        await fs.symlink(grovePath, path.join(dir, '.claude', 'settings.json'));
        return { path: dir, grovePath };
      });

      when('[t0] write is called', () => {
        const scene = useBeforeAll(async () => {
          await writeClaudeCodeSettings({
            settings: { repo: true },
            to: repo.path,
          });
          const grove = await fs.readFile(repo.grovePath, 'utf-8');
          return { grove };
        });

        then(
          'the grove file is byte-identical — no write goes through the arrow',
          () => {
            expect(scene.grove).toEqual('{"grove":true}\n');
          },
        );
      });
    });
  });
});
