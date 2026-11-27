import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

import { HOOK_DISPATCH } from './constants';

/**
 * .what = the timeout of one event's dispatcher wire: the floor or the slowest rule, whichever is
 *   higher, plus the margin
 * .why = claude must never kill the dispatcher before the dispatcher kills a hung rule; the floor
 *   keeps a later row within it from a settings write, and gives a zero-row event a timeout
 *
 * .note = a rule slower than the floor raises the wire; a seat already up keeps its old wire until
 *   it respawns
 */
export const asHookDispatcherTimeoutSeconds = (input: {
  rules: Pick<HookDispatchRule, 'event' | 'timeoutSeconds'>[];
  event: string;
}): number =>
  Math.max(
    HOOK_DISPATCH.timeoutFloorSeconds,
    ...input.rules
      .filter((rule) => rule.event === input.event)
      .map((rule) => rule.timeoutSeconds),
  ) + HOOK_DISPATCH.timeoutMarginSeconds;
