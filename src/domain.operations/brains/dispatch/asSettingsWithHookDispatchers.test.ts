import { given, then, when } from 'test-fns';

import { genSampleHookDispatchRule } from '@src/.test/assets/genSampleHookDispatchRule';
import type { ClaudeCodeSettings } from '@src/domain.operations/brains/claudeCodeSettings';

import { asHookDispatchersOfRules } from './asHookDispatchersOfRules';
import { asSettingsWithHookDispatchers } from './asSettingsWithHookDispatchers';
import { HOOK_DISPATCH } from './constants';

const MANIFEST_PATH =
  '.agent/.actors/actor.via.slug=demo/brain/.claude/hooks.dispatch.manifest';

// a rule with sane defaults; each case overrides what it tests
const genRule = genSampleHookDispatchRule;

// a hook a human added by hand: no dispatcher author
const handHook = { type: 'command', command: 'echo hand', timeout: 7 };

// a hook of a prior dispatcher, to be dropped
const priorDispatcherHook = {
  type: 'command',
  command: 'bash ./old/hooks.dispatch.sh old.manifest Stop',
  timeout: 99,
  author: HOOK_DISPATCH.author,
};

describe('asSettingsWithHookDispatchers', () => {
  given('[case1] settings with no hooks', () => {
    const settings: ClaudeCodeSettings = { model: 'demo-model' };

    when('[t0] rules of two events are set', () => {
      const rules = [
        genRule({ event: 'Stop' }),
        genRule({ event: 'PreToolUse', matcher: 'Bash' }),
        genRule({ event: 'Stop', command: 'echo two' }),
      ];
      const result = asSettingsWithHookDispatchers({
        settings,
        rules,
        manifestPathRel: MANIFEST_PATH,
      });

      then('one dispatcher hook sits under each event', () => {
        expect(result.hooks?.Stop).toHaveLength(1);
        expect(result.hooks?.Stop?.[0]?.hooks).toHaveLength(1);
        expect(result.hooks?.PreToolUse).toHaveLength(1);
        expect(result.hooks?.PreToolUse?.[0]?.hooks).toHaveLength(1);
      });

      then('each dispatcher hook carries the dispatcher author', () => {
        expect(result.hooks?.Stop?.[0]?.hooks[0]?.author).toEqual(
          HOOK_DISPATCH.author,
        );
        expect(result.hooks?.PreToolUse?.[0]?.hooks[0]?.author).toEqual(
          HOOK_DISPATCH.author,
        );
      });

      then(
        'each entry takes the matcher, command, and timeout of its dispatcher',
        () => {
          const dispatchers = asHookDispatchersOfRules({
            rules,
            manifestPathRel: MANIFEST_PATH,
          });
          dispatchers.map((dispatcher) => {
            const entry =
              result.hooks?.[dispatcher.event as 'Stop' | 'PreToolUse']?.[0];
            expect(entry?.matcher).toEqual(dispatcher.matcher);
            expect(entry?.hooks[0]).toEqual({
              type: 'command',
              command: dispatcher.command,
              timeout: dispatcher.timeoutSeconds,
              author: HOOK_DISPATCH.author,
            });
          });
        },
      );

      then('keys other than hooks are kept', () => {
        expect(result.model).toEqual('demo-model');
      });

      then('the input settings are not mutated', () => {
        expect(settings).toEqual({ model: 'demo-model' });
      });

      then('a second set of the same rules equals the first', () => {
        const twice = asSettingsWithHookDispatchers({
          settings: result,
          rules,
          manifestPathRel: MANIFEST_PATH,
        });
        expect(twice).toEqual(result);
      });
    });

    when('[t1] no rules are set', () => {
      const result = asSettingsWithHookDispatchers({
        settings,
        rules: [],
        manifestPathRel: MANIFEST_PATH,
      });

      then('the hooks hold no event', () => {
        expect(result.hooks).toEqual({});
      });
    });
  });

  given(
    '[case2] settings with prior dispatcher hooks and a hand-added hook',
    () => {
      const settings: ClaudeCodeSettings = {
        hooks: {
          Stop: [{ matcher: '*', hooks: [handHook, priorDispatcherHook] }],
          SessionStart: [{ matcher: '*', hooks: [priorDispatcherHook] }],
          PreToolUse: [
            { matcher: 'Bash', hooks: [handHook] },
            { matcher: 'Write', hooks: [priorDispatcherHook] },
          ],
        },
      };

      when('[t0] rules of one event are set', () => {
        const result = asSettingsWithHookDispatchers({
          settings,
          rules: [genRule({ event: 'Stop' })],
          manifestPathRel: MANIFEST_PATH,
        });

        then('every prior dispatcher hook is dropped', () => {
          const all = Object.values(result.hooks ?? {}).flatMap((entries) =>
            (entries ?? []).flatMap((entry) => entry.hooks),
          );
          const dispatchers = all.filter(
            (hook) => hook.author === HOOK_DISPATCH.author,
          );
          expect(dispatchers).toHaveLength(1);
          expect(dispatchers[0]?.command).not.toContain('old.manifest');
        });

        then('the hand-added hook stays, before the new dispatcher', () => {
          const hooksOfStop = result.hooks?.Stop?.[0]?.hooks ?? [];
          expect(hooksOfStop.map((hook) => hook.command)).toEqual([
            'echo hand',
            `bash ${HOOK_DISPATCH.bin} ${MANIFEST_PATH} Stop`,
          ]);
        });

        then('an entry left empty by the drop leaves the settings', () => {
          expect(result.hooks?.PreToolUse).toEqual([
            { matcher: 'Bash', hooks: [handHook] },
          ]);
        });

        then('an event left with no entry leaves the settings', () => {
          expect(result.hooks).not.toHaveProperty('SessionStart');
        });

        then('a second set of the result equals the result', () => {
          const twice = asSettingsWithHookDispatchers({
            settings: result,
            rules: [genRule({ event: 'Stop' })],
            manifestPathRel: MANIFEST_PATH,
          });
          expect(twice).toEqual(result);
        });
      });

      when('[t1] no rules are set', () => {
        const result = asSettingsWithHookDispatchers({
          settings,
          rules: [],
          manifestPathRel: MANIFEST_PATH,
        });

        then('only hand-added hooks remain', () => {
          expect(result.hooks).toEqual({
            Stop: [{ matcher: '*', hooks: [handHook] }],
            PreToolUse: [{ matcher: 'Bash', hooks: [handHook] }],
          });
        });
      });
    },
  );

  given(
    '[case3] settings that still hold role hooks (a faulted sync, a stale checkout)',
    () => {
      // a role hook kept beside the dispatcher would run twice: once as itself, once as a rule
      const roleHook = {
        type: 'command',
        command: './node_modules/.bin/rhx guard --mode hook',
        timeout: 5,
        author: 'repo=demo/role=tester',
      };
      const settings: ClaudeCodeSettings = {
        hooks: {
          PreToolUse: [{ matcher: 'Bash', hooks: [roleHook, handHook] }],
          Stop: [{ matcher: '*', hooks: [roleHook] }],
        },
      };

      when('[t0] the rules those hooks became are set', () => {
        const result = asSettingsWithHookDispatchers({
          settings,
          rules: [genRule({ event: 'PreToolUse', matcher: 'Bash' })],
          manifestPathRel: MANIFEST_PATH,
        });

        then('no role hook remains beside the dispatcher', () => {
          const all = Object.values(result.hooks ?? {}).flatMap((entries) =>
            (entries ?? []).flatMap((entry) => entry.hooks),
          );
          expect(all.filter((hook) => hook.author === roleHook.author)).toEqual(
            [],
          );
        });

        then('the hand-added hook stays, before the dispatcher', () => {
          expect(
            result.hooks?.PreToolUse?.[0]?.hooks.map((hook) => hook.command),
          ).toEqual([
            'echo hand',
            `bash ${HOOK_DISPATCH.bin} ${MANIFEST_PATH} PreToolUse`,
          ]);
        });

        then('an event the role hooks alone held leaves the settings', () => {
          expect(result.hooks).not.toHaveProperty('Stop');
        });
      });
    },
  );

  given(
    '[case4] an event entry whose matcher equals the dispatcher matcher',
    () => {
      const settings: ClaudeCodeSettings = {
        hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [handHook] }] },
      };

      when('[t0] a rule of that matcher is set', () => {
        const result = asSettingsWithHookDispatchers({
          settings,
          rules: [genRule({ event: 'PreToolUse', matcher: 'Bash' })],
          manifestPathRel: MANIFEST_PATH,
        });

        then('the dispatcher joins the entry, at its end', () => {
          expect(result.hooks?.PreToolUse).toHaveLength(1);
          expect(result.hooks?.PreToolUse?.[0]?.hooks).toHaveLength(2);
          expect(result.hooks?.PreToolUse?.[0]?.hooks[0]).toEqual(handHook);
          expect(result.hooks?.PreToolUse?.[0]?.hooks[1]?.author).toEqual(
            HOOK_DISPATCH.author,
          );
        });
      });
    },
  );

  given(
    '[case5] an event entry whose matcher differs from the dispatcher matcher',
    () => {
      const settings: ClaudeCodeSettings = {
        hooks: { PreToolUse: [{ matcher: 'Write', hooks: [handHook] }] },
      };

      when('[t0] a rule of another matcher is set', () => {
        const result = asSettingsWithHookDispatchers({
          settings,
          rules: [genRule({ event: 'PreToolUse', matcher: 'Bash' })],
          manifestPathRel: MANIFEST_PATH,
        });

        then(
          'the dispatcher takes an entry of its own, after the extant one',
          () => {
            expect(
              result.hooks?.PreToolUse?.map((entry) => entry.matcher),
            ).toEqual(['Write', 'Bash']);
          },
        );
      });
    },
  );
});
