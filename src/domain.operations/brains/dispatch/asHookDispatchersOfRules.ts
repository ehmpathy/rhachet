import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

import { asHookDispatcherCommand } from './asHookDispatcherCommand';
import { HOOK_DISPATCH } from './constants';

/**
 * .what = the one dispatcher hook per claude event a set of rules needs
 * .why = claude starts one process per event, and only for a tool some rule names
 *
 * .note = the matcher is the union of the rules' matchers: any `*` → `*`; else every token,
 *   joined by `|`. a union with a regex reads as a regex, a superset — the dispatcher still
 *   checks each rule's own matcher before it runs the rule
 * .note = the timeout sits above the slowest rule's by the margin, so claude never kills the
 *   dispatcher before the dispatcher kills a hung rule; every rule holds a timeout of at least 1s
 * .note = events come back in the order their first rule holds
 */
export const asHookDispatchersOfRules = (input: {
  rules: HookDispatchRule[];
  manifestPathRel: string;
}): Array<{
  event: string;
  matcher: string;
  timeoutSeconds: number;
  command: string;
}> => {
  const events = [...new Set(input.rules.map((rule) => rule.event))];
  return events.map((event) => {
    const rulesOfEvent = input.rules.filter((rule) => rule.event === event);
    return {
      event,
      matcher: asMatcherUnion({
        matchers: rulesOfEvent.map((rule) => rule.matcher),
      }),
      timeoutSeconds:
        Math.max(...rulesOfEvent.map((rule) => rule.timeoutSeconds)) +
        HOOK_DISPATCH.timeoutMarginSeconds,
      command: asHookDispatcherCommand({
        manifestPathRel: input.manifestPathRel,
        event,
      }),
    };
  });
};

/**
 * .what = one claude matcher that fits every tool any of the given matchers fit
 */
const asMatcherUnion = (input: { matchers: string[] }): string => {
  if (input.matchers.some((matcher) => matcher === '*' || matcher === ''))
    return '*';
  // an exact list splits into its names; a regex stays whole, as a group
  const tokens = input.matchers.flatMap((matcher) =>
    /^[A-Za-z0-9_|,]+$/.test(matcher)
      ? matcher.split(/[|,]/)
      : [`(${matcher})`],
  );
  return [...new Set(tokens)].join('|');
};
