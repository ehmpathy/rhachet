import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import {
  genBrainHooksAdapterForClaudeCode,
  readClaudeCodeSettings,
  writeClaudeCodeSettings,
} from '@src/_topublish/rhachet-brains-anthropic/src';
import { BrainHook } from '@src/domain.objects/BrainHook';
import { BrainHookFilter } from '@src/domain.objects/BrainHookFilter';
import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { HOOK_DISPATCH } from './constants';
import { setHookDispatchersViaAdapter } from './setHookDispatchersViaAdapter';

/**
 * .what = a real claude adapter whose writes are recorded in call order
 * .why = the swap order is the guarantee under test; the adapter is injected, never mocked
 */
const asAdapterRecorded = (input: {
  adapter: BrainHooksAdapter;
  calls: string[];
}): BrainHooksAdapter => ({
  ...input.adapter,
  dao: {
    ...input.adapter.dao,
    set: {
      ...input.adapter.dao.set,
      async upsert(query) {
        input.calls.push(`upsert ${query.hook.author}`);
        return input.adapter.dao.set.upsert(query);
      },
    },
    async del(query) {
      input.calls.push(`del ${query.by.unique.author}`);
      return input.adapter.dao.del(query);
    },
  },
});

describe('setHookDispatchersViaAdapter', () => {
  given(
    '[case1] settings that still hold a role hook, and its rule in the manifest',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genTempDir({ slug: 'dispatch-swap-order' });
        mkdirSync(join(repoPath, '.claude'), { recursive: true });
        const adapter = genBrainHooksAdapterForClaudeCode({ repoPath });
        await adapter.dao.set.upsert({
          hook: new BrainHook({
            author: 'repo=test/role=tester',
            event: 'onTool',
            command: 'echo tool',
            timeout: 'PT10S',
            filter: { what: 'Bash' },
          }),
        });
        const rule = new HookDispatchRule({
          event: 'PreToolUse',
          matcher: 'Bash',
          timeoutSeconds: 10,
          author: 'repo=test/role=tester',
          kind: 'foreign',
          path: '',
          frame: '',
          args: [],
          command: 'echo tool',
          when: null,
        });
        return { adapter, rule };
      });

      when('[t0] the dispatchers are set', () => {
        const result = useBeforeAll(async () => {
          const calls: string[] = [];
          await setHookDispatchersViaAdapter({
            adapter: asAdapterRecorded({ adapter: scene.adapter, calls }),
            rules: [scene.rule],
            manifestPathRel: '.claude/hooks.dispatch.manifest',
          });
          return { calls, after: await scene.adapter.dao.get.all() };
        });

        then(
          'the dispatcher is upserted before the role hook is taken back, so no seat meets a gap',
          () => {
            expect(result.calls).toEqual([
              `upsert ${HOOK_DISPATCH.author}`,
              `upsert ${HOOK_DISPATCH.author}`,
              `upsert ${HOOK_DISPATCH.author}`,
              `upsert ${HOOK_DISPATCH.author}`,
              'del repo=test/role=tester',
            ]);
          },
        );

        then('the settings then hold the four dispatchers alone', () => {
          expect(result.after.map((hook) => hook.author)).toEqual([
            HOOK_DISPATCH.author,
            HOOK_DISPATCH.author,
            HOOK_DISPATCH.author,
            HOOK_DISPATCH.author,
          ]);
        });
      });
    },
  );

  /**
   * .what = the claude code adapters a re-sync must read back: the in-repo one, and the one
   *   installed from npm, which the cli loads
   */
  const ADAPTERS: Array<{
    name: string;
    gen: (input: { repoPath: string }) => BrainHooksAdapter;
  }> = [
    { name: 'the in-repo adapter', gen: genBrainHooksAdapterForClaudeCode },
    {
      name: 'the installed adapter',
      gen: (input) =>
        jest
          .requireActual('rhachet-brains-anthropic')
          .genBrainHooksAdapterForClaudeCode(input),
    },
  ];

  /**
   * .what = one rule per claude event; PreToolUse holds two tool matchers, yet its dispatcher
   *   carries `*`, so a row added later needs no settings write
   */
  const asRule = (input: {
    event: string;
    matcher: string;
  }): HookDispatchRule =>
    new HookDispatchRule({
      event: input.event,
      matcher: input.matcher,
      timeoutSeconds: 10,
      author: 'repo=test/role=tester',
      kind: 'foreign',
      path: '',
      frame: '',
      args: [],
      command: `echo ${input.event}`,
      when: null,
    });
  const RULES = [
    asRule({ event: 'SessionStart', matcher: '*' }),
    asRule({ event: 'PreToolUse', matcher: 'Bash' }),
    asRule({ event: 'PreToolUse', matcher: 'Write' }),
    asRule({ event: 'UserPromptSubmit', matcher: '*' }),
    asRule({ event: 'Stop', matcher: '*' }),
  ];

  // a hook a human added by hand: no author, so no sync may move it
  const HAND_HOOK = { type: 'command', command: 'echo hand', timeout: 7 };

  /**
   * .what = a temp repo whose claude settings already hold the dispatchers RULES need
   */
  const genSceneWired = async (input: { slug: string }) => {
    const repoPath = genTempDir({ slug: input.slug });
    mkdirSync(join(repoPath, '.claude'), { recursive: true });
    const adapter = genBrainHooksAdapterForClaudeCode({ repoPath });
    await setHookDispatchersViaAdapter({
      adapter,
      rules: RULES,
      manifestPathRel: '.claude/hooks.dispatch.manifest',
    });
    return { adapter, repoPath };
  };

  given(
    '[case4] dispatchers in place, then the Stop event loses its last rule',
    () => {
      const scene = useBeforeAll(async () =>
        genSceneWired({ slug: 'dispatch-swap-emptied' }),
      );

      when('[t0] the dispatchers are set from the rules without Stop', () => {
        const result = useBeforeAll(async () => {
          const calls: string[] = [];
          await setHookDispatchersViaAdapter({
            adapter: asAdapterRecorded({ adapter: scene.adapter, calls }),
            rules: RULES.filter((rule) => rule.event !== 'Stop'),
            manifestPathRel: '.claude/hooks.dispatch.manifest',
          });
          return { calls, after: await scene.adapter.dao.get.all() };
        });

        then('naught is written: a wire waits on an event with no rows', () => {
          expect(result.calls).toEqual([]);
        });

        then(
          'the Stop dispatcher stays in place, beside the other three',
          () => {
            expect(
              result.after
                .filter((hook) => hook.author === HOOK_DISPATCH.author)
                .map((hook) => hook.event)
                .sort(),
            ).toEqual(['onBoot', 'onStop', 'onTalk', 'onTool']);
          },
        );
      });
    },
  );

  given(
    '[case5] dispatchers in place, then a row is added for a tool and an event no row named',
    () => {
      const scene = useBeforeAll(async () =>
        genSceneWired({ slug: 'dispatch-swap-later-row' }),
      );

      when('[t0] the dispatchers are set from the grown rules', () => {
        const result = useBeforeAll(async () => {
          const calls: string[] = [];
          const swap = await setHookDispatchersViaAdapter({
            adapter: asAdapterRecorded({ adapter: scene.adapter, calls }),
            rules: [
              ...RULES.filter((rule) => rule.event !== 'UserPromptSubmit'),
              asRule({ event: 'PreToolUse', matcher: 'Agent' }),
              asRule({ event: 'UserPromptSubmit', matcher: '*' }),
            ],
            manifestPathRel: '.claude/hooks.dispatch.manifest',
          });
          return { calls, swap };
        });

        then(
          'naught is written: the wire in place already reaches the new row',
          () => {
            expect(result.calls).toEqual([]);
            expect(result.swap.dispatchersSet).toEqual(0);
          },
        );
      });
    },
  );

  given(
    '[case6] settings whose PreToolUse dispatcher carries a union matcher, from an older sync',
    () => {
      const scene = useBeforeAll(async () => {
        const base = await genSceneWired({ slug: 'dispatch-swap-union' });
        const found = await base.adapter.dao.get.all();
        const wire = found.find((hook) => hook.event === 'onTool')!;
        await base.adapter.dao.set.upsert({
          hook: new BrainHook({
            author: wire.author,
            event: wire.event,
            command: wire.command,
            timeout: wire.timeout,
            filter: new BrainHookFilter({ what: 'Bash|Write' }),
          }),
        });

        // a hook a human added by hand, under the union's own matcher
        const settings = await readClaudeCodeSettings({ from: base.repoPath });
        await writeClaudeCodeSettings({
          settings: {
            ...settings,
            hooks: {
              ...settings.hooks,
              PreToolUse: [
                ...(settings.hooks?.PreToolUse ?? []),
                { matcher: 'Bash|Write', hooks: [HAND_HOOK] },
              ],
            },
          },
          to: base.repoPath,
        });
        return base;
      });

      when('[t0] the dispatchers are set again', () => {
        const result = useBeforeAll(async () => {
          const calls: string[] = [];
          await setHookDispatchersViaAdapter({
            adapter: asAdapterRecorded({ adapter: scene.adapter, calls }),
            rules: RULES,
            manifestPathRel: '.claude/hooks.dispatch.manifest',
          });
          return { calls, after: await scene.adapter.dao.get.all() };
        });

        then(
          'the union wire is rewritten once, and naught is taken back',
          () => {
            expect(result.calls).toEqual([`upsert ${HOOK_DISPATCH.author}`]);
          },
        );

        then('every dispatcher now reaches every tool', () => {
          expect(
            result.after
              .filter((hook) => hook.author === HOOK_DISPATCH.author)
              .map((hook) => hook.filter?.what ?? '*'),
          ).toEqual(['*', '*', '*', '*']);
        });

        then('the hand-added hook stays under its own matcher', async () => {
          const settings = await readClaudeCodeSettings({
            from: scene.repoPath,
          });
          expect(settings.hooks?.PreToolUse).toContainEqual({
            matcher: 'Bash|Write',
            hooks: [HAND_HOOK],
          });
        });
      });
    },
  );

  given('[case7] dispatchers in place, then the manifest is absent', () => {
    const scene = useBeforeAll(async () =>
      genSceneWired({ slug: 'dispatch-swap-absent' }),
    );

    when('[t0] the dispatchers are set with no rules to read', () => {
      const result = useBeforeAll(async () => {
        const calls: string[] = [];
        const swap = await setHookDispatchersViaAdapter({
          adapter: asAdapterRecorded({ adapter: scene.adapter, calls }),
          rules: null,
          manifestPathRel: '.claude/hooks.dispatch.manifest',
        });
        return { calls, swap, after: await scene.adapter.dao.get.all() };
      });

      then(
        'every dispatcher is taken back: a wire at an absent manifest would refuse every call',
        () => {
          expect(result.calls).toEqual([
            `del ${HOOK_DISPATCH.author}`,
            `del ${HOOK_DISPATCH.author}`,
            `del ${HOOK_DISPATCH.author}`,
            `del ${HOOK_DISPATCH.author}`,
          ]);
          expect(result.after).toEqual([]);
        },
      );

      then(
        'the swap counts the four it took back, so the sync can name them',
        () => {
          expect(result.swap).toEqual({
            dispatchers: 0,
            dispatchersSet: 0,
            dispatchersTakenBack: 4,
            roleHooksTakenBack: 0,
          });
        },
      );
    });
  });

  ADAPTERS.forEach((each, index) =>
    given(
      `[case${index + 2}] dispatchers already in place, via ${each.name}`,
      () => {
        const scene = useBeforeAll(async () => {
          const repoPath = genTempDir({ slug: 'dispatch-swap-rerun' });
          mkdirSync(join(repoPath, '.claude'), { recursive: true });
          const adapter = each.gen({ repoPath });
          const first = await setHookDispatchersViaAdapter({
            adapter,
            rules: RULES,
            manifestPathRel: '.claude/hooks.dispatch.manifest',
          });
          return { adapter, first };
        });

        when('[t0] the dispatchers are set again', () => {
          const result = useBeforeAll(async () => {
            const calls: string[] = [];
            const second = await setHookDispatchersViaAdapter({
              adapter: asAdapterRecorded({ adapter: scene.adapter, calls }),
              rules: RULES,
              manifestPathRel: '.claude/hooks.dispatch.manifest',
            });
            return { calls, second };
          });

          then('the first set wrote one `*` dispatcher per event', () => {
            expect(scene.first).toEqual({
              dispatchers: 4,
              dispatchersSet: 4,
              dispatchersTakenBack: 0,
              roleHooksTakenBack: 0,
            });
          });

          then(
            'the second set writes naught, so a rerun reads as a no-op',
            () => {
              expect(result.calls).toEqual([]);
              expect(result.second).toEqual({
                dispatchers: scene.first.dispatchers,
                dispatchersSet: 0,
                dispatchersTakenBack: 0,
                roleHooksTakenBack: 0,
              });
            },
          );
        });
      },
    ),
  );
});
