import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

import { asHookDispatcherCommand } from './asHookDispatcherCommand';
import { HOOK_DISPATCH, HOOK_DISPATCH_EVENTS } from './constants';

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
 * .note = events come back in `HOOK_DISPATCH_EVENTS` order; an event a row names beyond those (none
 *   can be written by the sync today) follows, in the order its first row holds
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

  // every mapped event, then any event a row names beyond them
  const events = [
    ...new Set([...HOOK_DISPATCH_EVENTS, ...rules.map((rule) => rule.event)]),
  ];
  return events.map((event) => ({
    event,
    matcher: '*',
    timeoutSeconds:
      Math.max(
        HOOK_DISPATCH.timeoutFloorSeconds,
        ...rules
          .filter((rule) => rule.event === event)
          .map((rule) => rule.timeoutSeconds),
      ) + HOOK_DISPATCH.timeoutMarginSeconds,
    command: asHookDispatcherCommand({
      manifestPathRel: input.manifestPathRel,
      event,
    }),
  }));
};
