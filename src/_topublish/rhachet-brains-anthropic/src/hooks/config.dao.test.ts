import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { readClaudeCodeSettings, writeClaudeCodeSettings } from './config.dao';

describe('config.dao', () => {
  describe('readClaudeCodeSettings', () => {
    given('[case1] empty repo (no .claude/settings.json)', () => {
      const repo = useBeforeAll(async () => {
        const dir = path.join(os.tmpdir(), `claude-config-test-${Date.now()}`);
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
        const dir = path.join(os.tmpdir(), `claude-config-test-${Date.now()}`);
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
  });

  describe('writeClaudeCodeSettings', () => {
    given('[case1] empty repo', () => {
      const repo = useBeforeAll(async () => {
        const dir = path.join(os.tmpdir(), `claude-config-test-${Date.now()}`);
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
            path.join(repo.path, '.claude', 'settings.json'),
            'utf-8',
          );
          return { content };
        });

        then('creates .claude directory', async () => {
          const stat = await fs.stat(path.join(repo.path, '.claude'));
          expect(stat.isDirectory()).toBe(true);
        });

        then('writes settings.json', () => {
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
        const dir = path.join(os.tmpdir(), `claude-config-test-${Date.now()}`);
        await fs.mkdir(path.join(dir, '.claude'), { recursive: true });
        await fs.writeFile(
          path.join(dir, '.claude', 'settings.json'),
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
            path.join(repo.path, '.claude', 'settings.json'),
            'utf-8',
          );
          return { content };
        });

        then('overwrites prior file', () => {
          expect(scene.content).not.toContain('oldData');
          expect(scene.content).toContain('newData');
        });
      });
    });
  });
});
