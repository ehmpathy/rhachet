import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

/**
 * .what = each claude event's rule count, in the order the manifest first names the event
 * .why = the sync report shows which event holds how many rules behind its one dispatcher, so a
 *   human sees where the rules went, not a bare total
 */
export const asRuleCountsByEvent = (input: {
  rules: Pick<HookDispatchRule, 'event'>[];
}): Array<{ event: string; rules: number }> => {
  const events = [...new Set(input.rules.map((rule) => rule.event))];
  return events.map((event) => ({
    event,
    rules: input.rules.filter((rule) => rule.event === event).length,
  }));
};
