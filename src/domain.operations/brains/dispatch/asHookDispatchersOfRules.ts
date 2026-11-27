import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

import { asHookDispatcherCommand } from './asHookDispatcherCommand';
import { asHookDispatcherTimeoutSeconds } from './asHookDispatcherTimeoutSeconds';
import { HOOK_DISPATCH_EVENTS } from './constants';

/**
 * .what = the one dispatcher hook per claude event a manifest needs
 * .why = the wire holds naught the rows decide: every mapped event, matcher `*`, a timeout at the
 *   floor. so a row added after a seat starts fires on its next event with no settings write, and
 *   the manifest stays the one place that decides which rule runs on which tool
 *
 * .note = `rules: null` means no manifest: no dispatchers, since a wire named at an absent manifest
 *   would refuse every call. `rules: []` means an empty manifest: every event still gets its wire
 * .note = the dispatcher checks each row's own matcher before it runs the row, so `*` here never
 *   widens which tool a rule runs on
 * .note = the timeout sits above the slowest rule's, and never below the floor, by the margin, so
 *   claude never kills the dispatcher before the dispatcher kills a hung rule
 * .note = events come back in `HOOK_DISPATCH_EVENTS` order: the four claude events a role hook maps
 *   to, so no sync can write a row on any other
 */
export const asHookDispatchersOfRules = (input: {
  rules: HookDispatchRule[] | null;
  manifestPathRel: string;
}): Array<{
  event: string;
  matcher: string;
  timeoutSeconds: number;
  command: string;
}> => {
  // no manifest, no wire
  if (!input.rules) return [];
  const rules = input.rules;

  // one wire per mapped event, rows or not
  return HOOK_DISPATCH_EVENTS.map((event) => ({
    event,
    matcher: '*',
    timeoutSeconds: asHookDispatcherTimeoutSeconds({ rules, event }),
    command: asHookDispatcherCommand({
      manifestPathRel: input.manifestPathRel,
      event,
    }),
  }));
};
