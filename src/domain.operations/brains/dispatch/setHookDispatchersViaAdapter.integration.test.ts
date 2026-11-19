import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genBrainHooksAdapterForClaudeCode } from '@src/_topublish/rhachet-brains-anthropic/src';
import { BrainHook } from '@src/domain.objects/BrainHook';
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
              'del repo=test/role=tester',
            ]);
          },
        );

        then('the settings then hold the dispatcher alone', () => {
          expect(result.after.map((hook) => hook.author)).toEqual([
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
   * .what = one rule per claude event; PreToolUse holds two tool matchers, so its dispatcher
   *   carries a list matcher (`Bash|Write`) the adapter must read back as written
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

  given(
    '[case4] dispatchers in place, then the Stop event loses its last rule',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genTempDir({ slug: 'dispatch-swap-emptied' });
        mkdirSync(join(repoPath, '.claude'), { recursive: true });
        const adapter = genBrainHooksAdapterForClaudeCode({ repoPath });
        await setHookDispatchersViaAdapter({
          adapter,
          rules: RULES,
          manifestPathRel: '.claude/hooks.dispatch.manifest',
        });
        return { adapter };
      });

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

        then(
          'the Stop dispatcher is taken back, and naught else is written',
          () => {
            expect(result.calls).toEqual([`del ${HOOK_DISPATCH.author}`]);
          },
        );

        then('no dispatcher is left on the emptied event', () => {
          expect(result.after.map((hook) => hook.event)).not.toContain(
            'onStop',
          );
          expect(result.after.length).toBeGreaterThan(0);
        });
      });
    },
  );

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

          then(
            'the first set wrote one dispatcher per event and matcher',
            () => {
              expect(scene.first.dispatchersSet).toEqual(
                scene.first.dispatchers,
              );
              expect(scene.first.dispatchers).toBeGreaterThan(0);
            },
          );

          then(
            'the second set writes naught, so a rerun reads as a no-op',
            () => {
              expect(result.calls).toEqual([]);
              expect(result.second).toEqual({
                dispatchers: scene.first.dispatchers,
                dispatchersSet: 0,
                roleHooksTakenBack: 0,
              });
            },
          );
        });
      },
    ),
  );
});
