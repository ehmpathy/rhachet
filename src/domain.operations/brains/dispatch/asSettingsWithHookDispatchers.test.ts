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

// the command of the dispatcher this manifest's event gets
const commandOf = (event: string) =>
  `bash ${HOOK_DISPATCH.bin} ${MANIFEST_PATH} ${event}`;

// the commands an event's entries hold, in order
const commandsOf = (input: {
  settings: ClaudeCodeSettings;
  event: 'SessionStart' | 'PreToolUse' | 'UserPromptSubmit' | 'Stop';
}) =>
  (input.settings.hooks?.[input.event] ?? []).flatMap((entry) =>
    entry.hooks.map((hook) => hook.command),
  );

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

    when('[t1] no rules are set (an empty manifest)', () => {
      const result = asSettingsWithHookDispatchers({
        settings,
        rules: [],
        manifestPathRel: MANIFEST_PATH,
      });

      then('every mapped event still holds one `*` dispatcher', () => {
        expect(
          Object.entries(result.hooks ?? {}).map(([event, entries]) => ({
            event,
            matchers: (entries ?? []).map((entry) => entry.matcher),
          })),
        ).toEqual(
          ['SessionStart', 'PreToolUse', 'UserPromptSubmit', 'Stop'].map(
            (event) => ({ event, matchers: ['*'] }),
          ),
        );
        expect(commandsOf({ settings: result, event: 'PreToolUse' })).toEqual([
          commandOf('PreToolUse'),
        ]);
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
          expect(dispatchers.map((hook) => hook.command)).toEqual([
            commandOf('Stop'),
            commandOf('SessionStart'),
            commandOf('PreToolUse'),
            commandOf('UserPromptSubmit'),
          ]);
        });

        then('the hand-added hook stays, before the new dispatcher', () => {
          const hooksOfStop = result.hooks?.Stop?.[0]?.hooks ?? [];
          expect(hooksOfStop.map((hook) => hook.command)).toEqual([
            'echo hand',
            commandOf('Stop'),
          ]);
        });

        then('an entry left empty by the drop leaves the settings', () => {
          expect(
            result.hooks?.PreToolUse?.map((entry) => entry.matcher),
          ).toEqual(['Bash', '*']);
          expect(result.hooks?.PreToolUse?.[0]).toEqual({
            matcher: 'Bash',
            hooks: [handHook],
          });
        });

        then('an event no row holds keeps only its fresh dispatcher', () => {
          expect(
            commandsOf({ settings: result, event: 'SessionStart' }),
          ).toEqual([commandOf('SessionStart')]);
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

        then('hand-added hooks remain, beside the fresh dispatchers', () => {
          const dispatcherOf = (event: string) => ({
            type: 'command',
            command: commandOf(event),
            timeout:
              HOOK_DISPATCH.timeoutFloorSeconds +
              HOOK_DISPATCH.timeoutMarginSeconds,
            author: HOOK_DISPATCH.author,
          });
          expect(result.hooks).toEqual({
            Stop: [{ matcher: '*', hooks: [handHook, dispatcherOf('Stop')] }],
            SessionStart: [
              { matcher: '*', hooks: [dispatcherOf('SessionStart')] },
            ],
            PreToolUse: [
              { matcher: 'Bash', hooks: [handHook] },
              { matcher: '*', hooks: [dispatcherOf('PreToolUse')] },
            ],
            UserPromptSubmit: [
              { matcher: '*', hooks: [dispatcherOf('UserPromptSubmit')] },
            ],
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
          expect(commandsOf({ settings: result, event: 'PreToolUse' })).toEqual(
            ['echo hand', commandOf('PreToolUse')],
          );
        });

        then(
          'an event the role hooks alone held keeps only its dispatcher',
          () => {
            expect(commandsOf({ settings: result, event: 'Stop' })).toEqual([
              commandOf('Stop'),
            ]);
          },
        );
      });
    },
  );

  given(
    '[case4] an event entry whose matcher equals the dispatcher matcher',
    () => {
      const settings: ClaudeCodeSettings = {
        hooks: { PreToolUse: [{ matcher: '*', hooks: [handHook] }] },
      };

      when('[t0] a rule of any matcher is set', () => {
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
            ).toEqual(['Write', '*']);
          },
        );
      });
    },
  );

  given(
    '[case6] a union entry from an older sync, which a hand-added hook shares with the dispatcher',
    () => {
      const settings: ClaudeCodeSettings = {
        hooks: {
          PreToolUse: [
            { matcher: 'Bash|Write', hooks: [handHook, priorDispatcherHook] },
          ],
        },
      };

      when('[t0] the rules are set again', () => {
        const result = asSettingsWithHookDispatchers({
          settings,
          rules: [genRule({ event: 'PreToolUse', matcher: 'Bash' })],
          manifestPathRel: MANIFEST_PATH,
        });

        then('the hand-added hook stays under its own matcher, alone', () => {
          expect(result.hooks?.PreToolUse?.[0]).toEqual({
            matcher: 'Bash|Write',
            hooks: [handHook],
          });
        });

        then('the dispatcher leaves the union entry for a `*` entry', () => {
          expect(
            result.hooks?.PreToolUse?.map((entry) => entry.matcher),
          ).toEqual(['Bash|Write', '*']);
          expect(commandsOf({ settings: result, event: 'PreToolUse' })).toEqual(
            ['echo hand', commandOf('PreToolUse')],
          );
        });
      });
    },
  );
});
