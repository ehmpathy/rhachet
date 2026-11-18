import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';
import type { ClaudeCodeSettings } from '@src/domain.operations/brains/claudeCodeSettings';

import { asHookDispatchersOfRules } from './asHookDispatchersOfRules';
import { HOOK_DISPATCH } from './constants';

/**
 * .what = claude settings whose dispatcher hooks match a set of rules and a manifest path
 * .why = an actor's settings carry dispatchers for its own rules alone, named at its own
 *   manifest; the repo actor's dispatchers name the repo actor's
 *
 * .note = every prior dispatcher hook leaves; every other hook stays as it is
 * .note = an event whose matcher entry already holds hooks takes the dispatcher at its end
 */
export const asSettingsWithHookDispatchers = (input: {
  settings: ClaudeCodeSettings;
  rules: HookDispatchRule[];
  manifestPathRel: string;
}): ClaudeCodeSettings => {
  type Hooks = NonNullable<ClaudeCodeSettings['hooks']>;
  type Entry = NonNullable<Hooks[keyof Hooks]>[number];

  // drop every prior dispatcher hook, and every entry left empty by the drop
  const hooksPrior: Record<string, Entry[]> = Object.fromEntries(
    Object.entries(input.settings.hooks ?? {}).map(([event, entries]) => [
      event,
      (entries ?? [])
        .map((entry: Entry) => ({
          ...entry,
          hooks: entry.hooks.filter(
            (hook) => hook.author !== HOOK_DISPATCH.author,
          ),
        }))
        .filter((entry: Entry) => entry.hooks.length > 0),
    ]),
  );

  // add one dispatcher per event the rules hold
  const dispatchers = asHookDispatchersOfRules({
    rules: input.rules,
    manifestPathRel: input.manifestPathRel,
  });
  const hooksNext = dispatchers.reduce<Record<string, Entry[]>>(
    (hooks, dispatcher) => {
      const hook = {
        type: 'command',
        command: dispatcher.command,
        timeout: dispatcher.timeoutSeconds,
        author: HOOK_DISPATCH.author,
      };
      const entries = hooks[dispatcher.event] ?? [];
      const index = entries.findIndex(
        (entry) => entry.matcher === dispatcher.matcher,
      );
      const entriesNext =
        index >= 0
          ? entries.map((entry, at) =>
              at === index
                ? { ...entry, hooks: [...entry.hooks, hook] }
                : entry,
            )
          : [...entries, { matcher: dispatcher.matcher, hooks: [hook] }];
      return { ...hooks, [dispatcher.event]: entriesNext };
    },
    hooksPrior,
  );

  // an event left with no entry leaves the settings
  const hooksKept: Hooks = Object.fromEntries(
    Object.entries(hooksNext).filter(([, entries]) => entries.length > 0),
  );
  return { ...input.settings, hooks: hooksKept };
};
