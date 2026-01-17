import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import {
  deleteOpencodePlugin,
  generatePluginContent,
  getPluginFileName,
  parsePluginContent,
  parsePluginFileName,
  readOpencodePlugins,
  writeOpencodePlugin,
} from './config.dao';

describe('config.dao', () => {
  describe('getPluginFileName', () => {
    given('[case1] hook metadata', () => {
      when('[t0] called with author, event, command', () => {
        const result = getPluginFileName({
          author: 'repo=test/role=tester',
          event: 'onBoot',
          command: 'echo "hello"',
        });

        then('returns rhachet-prefixed .ts filename', () => {
          expect(result).toMatch(/^rhachet-.*\.ts$/);
        });

        then('includes sanitized author', () => {
          expect(result).toContain('repo-test-role-tester');
        });

        then('includes event', () => {
          expect(result).toContain('onBoot');
        });
      });
    });
  });

  describe('parsePluginFileName', () => {
    given('[case1] valid rhachet plugin filename', () => {
      when('[t0] parsed', () => {
        const result = parsePluginFileName(
          'rhachet-repo-test-role-tester-onBoot-ZWNobyAiaGVsbG8.ts',
        );

        then('returns author and event', () => {
          expect(result).not.toBeNull();
          expect(result?.author).toBe('repo-test-role-tester');
          expect(result?.event).toBe('onBoot');
        });
      });
    });

    given('[case2] invalid filename', () => {
      when('[t0] non-rhachet file', () => {
        const result = parsePluginFileName('other-plugin.ts');

        then('returns null', () => {
          expect(result).toBeNull();
        });
      });

      when('[t1] invalid event', () => {
        const result = parsePluginFileName('rhachet-author-onInvalid-hash.ts');

        then('returns null', () => {
          expect(result).toBeNull();
        });
      });
    });
  });

  describe('generatePluginContent', () => {
    given('[case1] onBoot hook', () => {
      when('[t0] generated', () => {
        const content = generatePluginContent({
          author: 'repo=test/role=tester',
          event: 'onBoot',
          command: 'echo "boot"',
          timeout: 30000,
        });

        then('includes header with metadata', () => {
          expect(content).toContain('author: repo=test/role=tester');
          expect(content).toContain('event: onBoot');
          expect(content).toContain('command: echo "boot"');
        });

        then('includes session.created hook', () => {
          expect(content).toContain('session:');
          expect(content).toContain('created:');
        });

        then('includes execSync call', () => {
          expect(content).toContain('execSync');
          expect(content).toContain('"echo \\"boot\\""');
        });
      });
    });

    given('[case2] onTool hook with filter', () => {
      when('[t0] generated', () => {
        const content = generatePluginContent({
          author: 'repo=test/role=tester',
          event: 'onTool',
          command: 'echo "tool"',
          filter: { what: 'Write' },
        });

        then('includes tool.execute.before hook', () => {
          expect(content).toContain('tool:');
          expect(content).toContain('execute:');
          expect(content).toContain('before:');
        });

        then('includes filter check', () => {
          expect(content).toContain('input.tool');
          expect(content).toContain('"Write"');
        });
      });
    });

    given('[case3] onStop hook', () => {
      when('[t0] generated', () => {
        const content = generatePluginContent({
          author: 'repo=test/role=tester',
          event: 'onStop',
          command: 'echo "stop"',
        });

        then('includes session.idle hook', () => {
          expect(content).toContain('session:');
          expect(content).toContain('idle:');
        });
      });
    });
  });

  describe('parsePluginContent', () => {
    given('[case1] valid plugin content', () => {
      when('[t0] parsed', () => {
        const content = `/**
 * rhachet-managed opencode plugin
 * author: repo=test/role=tester
 * event: onBoot
 * command: echo "hello"
 */
export const RhachetHook = {};`;

        const result = parsePluginContent(content);

        then('extracts author', () => {
          expect(result?.author).toBe('repo=test/role=tester');
        });

        then('extracts event', () => {
          expect(result?.event).toBe('onBoot');
        });

        then('extracts command', () => {
          expect(result?.command).toBe('echo "hello"');
        });
      });
    });

    given('[case2] invalid content', () => {
      when('[t0] content lacks metadata', () => {
        const content = `export const Plugin = {};`;
        const result = parsePluginContent(content);

        then('returns null', () => {
          expect(result).toBeNull();
        });
      });
    });
  });

  describe('readOpencodePlugins', () => {
    given('[case1] empty repo', () => {
      const repo = useBeforeAll(async () => {
        const dir = path.join(
          os.tmpdir(),
          `opencode-config-test-${Date.now()}`,
        );
        await fs.mkdir(dir, { recursive: true });
        return { path: dir };
      });

      when('[t0] read is called', () => {
        const scene = useBeforeAll(async () => {
          const plugins = await readOpencodePlugins({ from: repo.path });
          return { plugins };
        });

        then('returns empty array', () => {
          expect(scene.plugins).toEqual([]);
        });
      });
    });

    given('[case2] repo with plugins', () => {
      const repo = useBeforeAll(async () => {
        const dir = path.join(
          os.tmpdir(),
          `opencode-config-test-${Date.now()}`,
        );
        const pluginDir = path.join(dir, '.opencode', 'plugin');
        await fs.mkdir(pluginDir, { recursive: true });

        // write a plugin file
        await fs.writeFile(
          path.join(pluginDir, 'rhachet-author-onBoot-hash123456.ts'),
          `/**
 * rhachet-managed opencode plugin
 * author: test-author
 * event: onBoot
 * command: echo "test"
 */
export const RhachetHook = {};`,
          'utf-8',
        );

        return { path: dir };
      });

      when('[t0] read is called', () => {
        const scene = useBeforeAll(async () => {
          const plugins = await readOpencodePlugins({ from: repo.path });
          return { plugins };
        });

        then('returns found plugins', () => {
          expect(scene.plugins).toHaveLength(1);
        });

        then('includes filename', () => {
          expect(scene.plugins[0]?.filename).toBe(
            'rhachet-author-onBoot-hash123456.ts',
          );
        });

        then('includes parsed metadata', () => {
          expect(scene.plugins[0]?.meta.author).toBe('test-author');
          expect(scene.plugins[0]?.meta.event).toBe('onBoot');
        });
      });
    });
  });

  describe('writeOpencodePlugin', () => {
    given('[case1] empty repo', () => {
      const repo = useBeforeAll(async () => {
        const dir = path.join(
          os.tmpdir(),
          `opencode-config-test-${Date.now()}`,
        );
        await fs.mkdir(dir, { recursive: true });
        return { path: dir };
      });

      when('[t0] write is called', () => {
        const scene = useBeforeAll(async () => {
          const filename = await writeOpencodePlugin({
            meta: {
              author: 'repo=test/role=tester',
              event: 'onBoot',
              command: 'echo "hello"',
            },
            to: repo.path,
          });
          return { filename };
        });

        then('creates .opencode/plugin directory', async () => {
          const stat = await fs.stat(
            path.join(repo.path, '.opencode', 'plugin'),
          );
          expect(stat.isDirectory()).toBe(true);
        });

        then('returns filename', () => {
          expect(scene.filename).toMatch(/^rhachet-.*\.ts$/);
        });

        then('creates plugin file', async () => {
          const filePath = path.join(
            repo.path,
            '.opencode',
            'plugin',
            scene.filename,
          );
          const content = await fs.readFile(filePath, 'utf-8');
          expect(content).toContain('echo "hello"');
        });
      });
    });
  });

  describe('deleteOpencodePlugin', () => {
    given('[case1] plugin file present', () => {
      const repo = useBeforeAll(async () => {
        const dir = path.join(
          os.tmpdir(),
          `opencode-config-test-${Date.now()}`,
        );
        const pluginDir = path.join(dir, '.opencode', 'plugin');
        await fs.mkdir(pluginDir, { recursive: true });
        await fs.writeFile(
          path.join(pluginDir, 'rhachet-test-onBoot-hash.ts'),
          'content',
          'utf-8',
        );
        return { path: dir };
      });

      when('[t0] delete is called', () => {
        useBeforeAll(async () => {
          await deleteOpencodePlugin({
            filename: 'rhachet-test-onBoot-hash.ts',
            from: repo.path,
          });
          return {};
        });

        then('removes the file', async () => {
          const filePath = path.join(
            repo.path,
            '.opencode',
            'plugin',
            'rhachet-test-onBoot-hash.ts',
          );
          await expect(fs.access(filePath)).rejects.toThrow();
        });
      });
    });

    given('[case2] plugin file absent', () => {
      const repo = useBeforeAll(async () => {
        const dir = path.join(
          os.tmpdir(),
          `opencode-config-test-${Date.now()}`,
        );
        await fs.mkdir(dir, { recursive: true });
        return { path: dir };
      });

      when('[t0] delete is called', () => {
        then('does not throw', async () => {
          await expect(
            deleteOpencodePlugin({
              filename: 'nonexistent.ts',
              from: repo.path,
            }),
          ).resolves.not.toThrow();
        });
      });
    });
  });
});
