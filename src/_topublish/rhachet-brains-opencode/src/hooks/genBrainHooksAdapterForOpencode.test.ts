import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import type { BrainHook } from '../../../../domain.objects/BrainHook';
import { genBrainHooksAdapterForOpencode } from './genBrainHooksAdapterForOpencode';

describe('genBrainHooksAdapterForOpencode', () => {
  given('[case1] empty repo (no .opencode/plugin/)', () => {
    const repo = useBeforeAll(async () => {
      const dir = path.join(os.tmpdir(), `opencode-test-${Date.now()}`);
      await fs.mkdir(dir, { recursive: true });
      return { path: dir };
    });

    when('[t0] get.all is called', () => {
      const scene = useBeforeAll(async () => {
        const adapter = genBrainHooksAdapterForOpencode({
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
        const adapter = genBrainHooksAdapterForOpencode({
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

      then('creates plugin file', async () => {
        const pluginDir = path.join(repo.path, '.opencode', 'plugin');
        const files = await fs.readdir(pluginDir);
        expect(files.length).toBeGreaterThan(0);
        expect(files[0]).toMatch(/^rhachet-.*\.ts$/);
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
      const dir = path.join(os.tmpdir(), `opencode-test-${Date.now()}`);
      await fs.mkdir(dir, { recursive: true });

      // create initial hooks
      const adapter = genBrainHooksAdapterForOpencode({ repoPath: dir });
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
        const adapter = genBrainHooksAdapterForOpencode({
          repoPath: repo.path,
        });
        const hooks = await adapter.dao.get.all();
        return { hooks };
      });

      then('returns 2 hooks', () => {
        expect(scene.hooks.length).toBe(2);
      });
    });

    when('[t1] get.all with filter is called', () => {
      const scene = useBeforeAll(async () => {
        const adapter = genBrainHooksAdapterForOpencode({
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

    when('[t2] del is called', () => {
      const scene = useBeforeAll(async () => {
        const adapter = genBrainHooksAdapterForOpencode({
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

  given('[case3] hook with tool filter', () => {
    const repo = useBeforeAll(async () => {
      const dir = path.join(os.tmpdir(), `opencode-test-${Date.now()}`);
      await fs.mkdir(dir, { recursive: true });
      return { path: dir };
    });

    when('[t0] upsert hook with filter', () => {
      const scene = useBeforeAll(async () => {
        const adapter = genBrainHooksAdapterForOpencode({
          repoPath: repo.path,
        });
        await adapter.dao.set.upsert({
          hook: {
            author: 'repo=test/role=tester',
            event: 'onTool',
            command: 'echo "write only"',
            timeout: 'PT30S',
            filter: { what: 'write' },
          },
        });

        // read plugin content
        const pluginDir = path.join(repo.path, '.opencode', 'plugin');
        const files = await fs.readdir(pluginDir);
        const content = await fs.readFile(
          path.join(pluginDir, files[0]!),
          'utf-8',
        );
        return { content };
      });

      then('plugin content includes filter check', () => {
        expect(scene.content).toContain('input.tool');
        expect(scene.content).toContain('"write"');
      });
    });
  });
});
