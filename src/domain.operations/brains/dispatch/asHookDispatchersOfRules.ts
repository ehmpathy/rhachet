import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

import { asHookDispatcherCommand } from './asHookDispatcherCommand';
import { asHookDispatcherTimeoutSeconds } from './asHookDispatcherTimeoutSeconds';
import { HOOK_DISPATCH_EVENTS } from './constants';

/**
 * .what = the one dispatcher hook per claude event a manifest needs
 * .why = a row added after a seat starts fires on its next event with no settings write
 *
 * .note = every mapped event, matcher `*`; the dispatcher filters each row by its own matcher
 * .note = `rules: null` = no manifest = no wires; `rules: []` = empty manifest = every wire
 * .note = timeout = max(floor, slowest rule) + margin, in `HOOK_DISPATCH_EVENTS` order
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
