import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import type { BrainHook } from '@src/domain.objects/BrainHook';

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
        const settingsPath = path.join(
          repo.path,
          '.claude',
          'settings.of.repo.json',
        );
        const content = await fs.readFile(settingsPath, 'utf-8');
        expect(content).toContain('SessionStart');
      });

      then('hook is found in get.all', () => {
        expect(scene.hooks.length).toBe(1);
        expect(scene.hooks[0]?.event).toBe('onBoot');
        expect(scene.hooks[0]?.command).toBe('echo "hello"');
      });

      then(
        'the hook reads back with no filter: the author tag is not one',
        () => {
          expect(scene.hooks[0]?.filter).toBeUndefined();
        },
      );
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
        const settingsPath = path.join(
          repo.path,
          '.claude',
          'settings.of.repo.json',
        );
        const content = await fs.readFile(settingsPath, 'utf-8');
        const hooks = await adapter.dao.get.all();
        return { content, hooks };
      });

      then('settings contains matcher for filter', () => {
        expect(scene.content).toContain('Write');
      });

      then('the hook reads back with its declared filter, untagged', () => {
        expect(scene.hooks.map((hook) => hook.filter)).toEqual([
          { what: 'Write' },
        ]);
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

  given('[case6] del onTalk hook', () => {
    const repo = useBeforeAll(async () => {
      const dir = path.join(os.tmpdir(), `claude-test-${Date.now()}`);
      await fs.mkdir(dir, { recursive: true });

      // create onTalk hook
      const adapter = genBrainHooksAdapterForClaudeCode({ repoPath: dir });
      await adapter.dao.set.upsert({
        hook: {
          author: 'repo=test/role=tester',
          event: 'onTalk',
          command: 'echo "talk"',
          timeout: 'PT5S',
        },
      });

      return { path: dir };
    });

    when('[t0] del is called for onTalk hook', () => {
      const scene = useBeforeAll(async () => {
        const adapter = genBrainHooksAdapterForClaudeCode({
          repoPath: repo.path,
        });

        // verify hook exists before delete
        const hooksBefore = await adapter.dao.get.all();

        await adapter.dao.del({
          by: {
            unique: {
              author: 'repo=test/role=tester',
              event: 'onTalk',
              command: 'echo "talk"',
            },
          },
        });

        const hooksAfter = await adapter.dao.get.all();
        return { hooksBefore, hooksAfter };
      });

      then('hook existed before delete', () => {
        expect(scene.hooksBefore.length).toBe(1);
        expect(scene.hooksBefore[0]?.event).toBe('onTalk');
      });

      then('hook is removed after delete', () => {
        expect(scene.hooksAfter.length).toBe(0);
      });
    });
  });

  given(
    '[case7] an onTool hook whose filter.when moves from before to after',
    () => {
      const repo = useBeforeAll(async () => {
        const dir = path.join(os.tmpdir(), `claude-test-${Date.now()}`);
        await fs.mkdir(dir, { recursive: true });
        return { path: dir };
      });
      const hookBefore: BrainHook = {
        author: 'repo=test/role=tester',
        event: 'onTool',
        command: 'echo "fetch guard"',
        timeout: 'PT5S',
        filter: { what: 'WebFetch', when: 'before' },
      };

      when('[t0] upserted before, then upserted after', () => {
        const scene = useBeforeAll(async () => {
          const adapter = genBrainHooksAdapterForClaudeCode({
            repoPath: repo.path,
          });
          await adapter.dao.set.upsert({ hook: hookBefore });
          await adapter.dao.set.upsert({
            hook: {
              ...hookBefore,
              filter: { what: 'WebFetch', when: 'after' },
            },
          });
          const settings = JSON.parse(
            await fs.readFile(
              path.join(repo.path, '.claude', 'settings.of.repo.json'),
              'utf-8',
            ),
          );
          const hooks = await adapter.dao.get.all();
          return { settings, hooks };
        });

        then(
          'the hook lives in PostToolUse only, never left behind in PreToolUse',
          () => {
            expect(scene.settings.hooks.PreToolUse ?? []).toEqual([]);
            expect(scene.settings.hooks.PostToolUse).toHaveLength(1);
          },
        );

        then('it reads back once, as filter.when=after', () => {
          expect(scene.hooks.map((hook) => hook.filter)).toEqual([
            { what: 'WebFetch', when: 'after' },
          ]);
        });
      });

      when('[t1] del is called for the hook', () => {
        const scene = useBeforeAll(async () => {
          const adapter = genBrainHooksAdapterForClaudeCode({
            repoPath: repo.path,
          });
          await adapter.dao.del({
            by: {
              unique: {
                author: hookBefore.author,
                event: 'onTool',
                command: hookBefore.command,
              },
            },
          });
          return { hooks: await adapter.dao.get.all() };
        });

        then('the PostToolUse hook is removed too', () => {
          expect(scene.hooks).toEqual([]);
        });
      });
    },
  );
});
