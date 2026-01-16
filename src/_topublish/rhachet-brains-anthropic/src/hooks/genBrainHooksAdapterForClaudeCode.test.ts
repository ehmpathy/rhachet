import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import type { BrainHook } from '../../../../domain.objects/BrainHook';
import { genBrainHooksAdapterForClaudeCode } from './genBrainHooksAdapterForClaudeCode';

describe('genBrainHooksAdapterForClaudeCode', () => {
  given('[case1] empty repo (no .claude/settings.json)', () => {
    const repo = useBeforeAll(async () => {
      const dir = path.join(os.tmpdir(), `claude-test-${Date.now()}`);
      await fs.mkdir(dir, { recursive: true });
      return { path: dir };
    });

    when('[t0] get.all is called', () => {
      const scene = useBeforeAll(async () => {
        const adapter = genBrainHooksAdapterForClaudeCode({
          repoPath: repo.path,
        });
        const hooks = await adapter.dao.get.all();
        return { hooks };
      });

      then('returns empty array', () => {
        expect(scene.hooks).toEqual([]);
      });
    });

    when('[t1] set.upsert is called', () => {
      const scene = useBeforeAll(async () => {
        const adapter = genBrainHooksAdapterForClaudeCode({
          repoPath: repo.path,
        });
        const hook: BrainHook = {
          author: 'repo=test/role=tester',
          event: 'onBoot',
          command: 'echo "hello"',
          timeout: 'PT30S',
        };
        await adapter.dao.set.upsert({ hook });
        const hooks = await adapter.dao.get.all();
        return { hooks };
      });

      then('creates settings file', async () => {
        const settingsPath = path.join(repo.path, '.claude', 'settings.json');
        const content = await fs.readFile(settingsPath, 'utf-8');
        expect(content).toContain('SessionStart');
      });

      then('hook is found in get.all', () => {
        expect(scene.hooks.length).toBe(1);
        expect(scene.hooks[0]?.event).toBe('onBoot');
        expect(scene.hooks[0]?.command).toBe('echo "hello"');
      });
    });
  });

  given('[case2] repo with hooks', () => {
    const repo = useBeforeAll(async () => {
      const dir = path.join(os.tmpdir(), `claude-test-${Date.now()}`);
      await fs.mkdir(dir, { recursive: true });

      // create initial hooks
      const adapter = genBrainHooksAdapterForClaudeCode({ repoPath: dir });
      await adapter.dao.set.upsert({
        hook: {
          author: 'repo=test/role=tester',
          event: 'onBoot',
          command: 'echo "boot"',
          timeout: 'PT30S',
        },
      });
      await adapter.dao.set.upsert({
        hook: {
          author: 'repo=test/role=tester',
          event: 'onTool',
          command: 'echo "tool"',
          timeout: 'PT60S',
        },
      });

      return { path: dir };
    });

    when('[t0] get.all is called', () => {
      const scene = useBeforeAll(async () => {
        const adapter = genBrainHooksAdapterForClaudeCode({
          repoPath: repo.path,
        });
        const hooks = await adapter.dao.get.all();
        return { hooks };
      });

      then('returns 2 hooks', () => {
        expect(scene.hooks.length).toBe(2);
      });
    });

    when('[t1] get.all with author filter is called', () => {
      const scene = useBeforeAll(async () => {
        const adapter = genBrainHooksAdapterForClaudeCode({
          repoPath: repo.path,
        });
        const hooks = await adapter.dao.get.all({
          by: { author: 'repo=test/role=tester' },
        });
        return { hooks };
      });

      then('returns filtered hooks', () => {
        expect(scene.hooks.length).toBe(2);
        expect(
          scene.hooks.every((h) => h.author === 'repo=test/role=tester'),
        ).toBe(true);
      });
    });

    when('[t2] get.all with event filter is called', () => {
      const scene = useBeforeAll(async () => {
        const adapter = genBrainHooksAdapterForClaudeCode({
          repoPath: repo.path,
        });
        const hooks = await adapter.dao.get.all({ by: { event: 'onBoot' } });
        return { hooks };
      });

      then('returns filtered hooks', () => {
        expect(scene.hooks.length).toBe(1);
        expect(scene.hooks[0]?.event).toBe('onBoot');
      });
    });

    when('[t3] del is called', () => {
      const scene = useBeforeAll(async () => {
        const adapter = genBrainHooksAdapterForClaudeCode({
          repoPath: repo.path,
        });
        await adapter.dao.del({
          by: {
            unique: {
              author: 'repo=test/role=tester',
              event: 'onBoot',
              command: 'echo "boot"',
            },
          },
        });
        const hooks = await adapter.dao.get.all();
        return { hooks };
      });

      then('removes the hook', () => {
        expect(scene.hooks.length).toBe(1);
        expect(scene.hooks[0]?.event).toBe('onTool');
      });
    });
  });

  given('[case3] get.one', () => {
    const repo = useBeforeAll(async () => {
      const dir = path.join(os.tmpdir(), `claude-test-${Date.now()}`);
      await fs.mkdir(dir, { recursive: true });

      const adapter = genBrainHooksAdapterForClaudeCode({ repoPath: dir });
      await adapter.dao.set.upsert({
        hook: {
          author: 'repo=test/role=tester',
          event: 'onBoot',
          command: 'echo "specific"',
          timeout: 'PT30S',
        },
      });

      return { path: dir };
    });

    when('[t0] hook present', () => {
      const scene = useBeforeAll(async () => {
        const adapter = genBrainHooksAdapterForClaudeCode({
          repoPath: repo.path,
        });
        const hookFound = await adapter.dao.get.one({
          by: {
            unique: {
              author: 'repo=test/role=tester',
              event: 'onBoot',
              command: 'echo "specific"',
            },
          },
        });
        return { hookFound };
      });

      then('returns the hook', () => {
        expect(scene.hookFound).not.toBeNull();
        expect(scene.hookFound?.command).toBe('echo "specific"');
      });
    });

    when('[t1] hook absent', () => {
      const scene = useBeforeAll(async () => {
        const adapter = genBrainHooksAdapterForClaudeCode({
          repoPath: repo.path,
        });
        const hookFound = await adapter.dao.get.one({
          by: {
            unique: {
              author: 'repo=test/role=tester',
              event: 'onBoot',
              command: 'echo "nonexistent"',
            },
          },
        });
        return { hookFound };
      });

      then('returns null', () => {
        expect(scene.hookFound).toBeNull();
      });
    });
  });

  given('[case4] hook with filter', () => {
    const repo = useBeforeAll(async () => {
      const dir = path.join(os.tmpdir(), `claude-test-${Date.now()}`);
      await fs.mkdir(dir, { recursive: true });
      return { path: dir };
    });

    when('[t0] upsert hook with filter', () => {
      const scene = useBeforeAll(async () => {
        const adapter = genBrainHooksAdapterForClaudeCode({
          repoPath: repo.path,
        });
        await adapter.dao.set.upsert({
          hook: {
            author: 'repo=test/role=tester',
            event: 'onTool',
            command: 'echo "filtered"',
            timeout: 'PT30S',
            filter: { what: 'Write' },
          },
        });

        // read settings file content
        const settingsPath = path.join(repo.path, '.claude', 'settings.json');
        const content = await fs.readFile(settingsPath, 'utf-8');
        return { content };
      });

      then('settings contains matcher for filter', () => {
        expect(scene.content).toContain('Write');
      });
    });
  });

  given('[case5] findsert idempotency', () => {
    const repo = useBeforeAll(async () => {
      const dir = path.join(os.tmpdir(), `claude-test-${Date.now()}`);
      await fs.mkdir(dir, { recursive: true });
      return { path: dir };
    });

    when('[t0] findsert same hook twice', () => {
      const scene = useBeforeAll(async () => {
        const adapter = genBrainHooksAdapterForClaudeCode({
          repoPath: repo.path,
        });
        const hook: BrainHook = {
          author: 'repo=test/role=tester',
          event: 'onBoot',
          command: 'echo "idempotent"',
          timeout: 'PT30S',
        };

        await adapter.dao.set.findsert({ hook });
        await adapter.dao.set.findsert({ hook });

        const hooks = await adapter.dao.get.all();
        return { hooks };
      });

      then('only one hook exists', () => {
        expect(scene.hooks.length).toBe(1);
      });
    });
  });
});
