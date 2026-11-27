import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

import { HOOK_DISPATCH_EVENTS } from './constants';

/**
 * .what = each wired claude event's rule count, `0` where the event holds none
 * .why = the sync report shows which event holds how many rules behind its one dispatcher, so a
 *   human sees where the rules went; a leaf per wire keeps the count of leaves equal to the count
 *   of dispatchers
 *
 * .note = the events match `asHookDispatchersOfRules`: none for `rules: null` (no manifest), else
 *   every mapped event, then any event a row names beyond them
 */
export const asRuleCountsByEvent = (input: {
  rules: Pick<HookDispatchRule, 'event'>[] | null;
}): Array<{ event: string; rules: number }> => {
  // no manifest, no wire to count
  if (!input.rules) return [];
  const rules = input.rules;

  // every mapped event, then any event a row names beyond them
  const events = [
    ...new Set([...HOOK_DISPATCH_EVENTS, ...rules.map((rule) => rule.event)]),
  ];
  return events.map((event) => ({
    event,
    rules: rules.filter((rule) => rule.event === event).length,
  }));
};
