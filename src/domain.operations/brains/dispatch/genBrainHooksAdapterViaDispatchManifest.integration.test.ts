import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genBrainHooksAdapterForClaudeCode } from '@src/_topublish/rhachet-brains-anthropic/src';
import { BrainHook } from '@src/domain.objects/BrainHook';

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { HOOK_DISPATCH } from './constants';
import { genBrainHooksAdapterViaDispatchManifest } from './genBrainHooksAdapterViaDispatchManifest';
import { getOneHookDispatchManifest } from './getOneHookDispatchManifest';

/**
 * .what = a temp repo whose claude settings hold one role hook and one hand-added hook, and the
 *   dispatch-manifest adapter over them
 */
const genScene = async (input: { slug: string }) => {
  const repoPath = genTempDir({ slug: input.slug });
  mkdirSync(join(repoPath, '.claude'), { recursive: true });
  const inner = genBrainHooksAdapterForClaudeCode({ repoPath });
  const hookRole = new BrainHook({
    author: 'repo=test/role=tester',
    event: 'onBoot',
    command: 'echo boot',
    timeout: 'PT30S',
  });
  const hookHand = new BrainHook({
    author: 'human',
    event: 'onBoot',
    command: 'echo mine',
    timeout: 'PT30S',
  });
  await inner.dao.set.upsert({ hook: hookRole });
  await inner.dao.set.upsert({ hook: hookHand });
  const manifestPath = join(repoPath, '.claude', HOOK_DISPATCH.manifest);
  const adapter = genBrainHooksAdapterViaDispatchManifest({
    adapter: inner,
    manifestPath,
    repoPath,
  });
  return { repoPath, inner, adapter, manifestPath, hookRole, hookHand };
};

describe('genBrainHooksAdapterViaDispatchManifest', () => {
  given('[case1] settings hold role hooks and no manifest exists yet', () => {
    const scene = useBeforeAll(async () =>
      genScene({ slug: 'dispatch-adapter-seed' }),
    );

    when('[t0] the hooks are read through the adapter', () => {
      const result = useBeforeAll(async () => ({
        hooks: await scene.adapter.dao.get.all(),
        manifest: await getOneHookDispatchManifest({
          path: scene.manifestPath,
        }),
      }));

      then('the manifest is seeded from the settings', () => {
        expect(existsSync(scene.manifestPath)).toEqual(true);
      });

      then('it holds the role hook and not the hand-added one', () => {
        const authors = (result.manifest?.rules ?? []).map(
          (rule) => rule.author,
        );
        expect(authors).toEqual(['repo=test/role=tester']);
      });

      then('the read returns the role hook as a declared hook', () => {
        expect(result.hooks.map((hook) => hook.command)).toEqual(['echo boot']);
        expect(result.hooks[0]!.event).toEqual('onBoot');
      });
    });
  });

  given('[case2] a manifest the adapter already seeded', () => {
    const scene = useBeforeAll(async () => {
      const base = await genScene({ slug: 'dispatch-adapter-write' });
      await base.adapter.dao.get.all();
      return base;
    });

    when('[t0] a new hook is upserted, then findserted again', () => {
      const result = useBeforeAll(async () => {
        const hookNew = new BrainHook({
          author: 'repo=test/role=tester',
          event: 'onTool',
          command: 'echo tool',
          timeout: 'PT10S',
          filter: { what: 'Bash' },
        });
        await scene.adapter.dao.set.upsert({ hook: hookNew });
        await scene.adapter.dao.set.findsert({ hook: hookNew });
        return {
          manifest: await getOneHookDispatchManifest({
            path: scene.manifestPath,
          }),
        };
      });

      then('the rule is appended once, never twice', () => {
        const commands = (result.manifest?.rules ?? []).map(
          (rule) => rule.command,
        );
        expect(commands).toEqual(['echo boot', 'echo tool']);
      });

      then('the rule keeps its event, matcher and timeout in seconds', () => {
        const rule = (result.manifest?.rules ?? []).find(
          (each) => each.command === 'echo tool',
        );
        expect(rule?.event).toEqual('PreToolUse');
        expect(rule?.matcher).toEqual('Bash');
        expect(rule?.timeoutSeconds).toEqual(10);
      });
    });

    when('[t1] the seeded hook is deleted', () => {
      const result = useBeforeAll(async () => {
        await scene.adapter.dao.del({
          by: {
            unique: {
              author: scene.hookRole.author,
              event: scene.hookRole.event,
              command: scene.hookRole.command,
            },
          },
        });
        return {
          manifest: await getOneHookDispatchManifest({
            path: scene.manifestPath,
          }),
        };
      });

      then('its rule leaves the manifest', () => {
        const commands = (result.manifest?.rules ?? []).map(
          (rule) => rule.command,
        );
        expect(commands).not.toContain('echo boot');
      });

      then(
        "the brain's own settings are untouched by the adapter",
        async () => {
          const hooksInner = await scene.inner.dao.get.all();
          expect(hooksInner.map((hook) => hook.command).sort()).toEqual([
            'echo boot',
            'echo mine',
          ]);
        },
      );
    });
  });
});
