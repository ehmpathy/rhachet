import { BrainHook } from '@src/domain.objects/BrainHook';
import { BrainHookFilter } from '@src/domain.objects/BrainHookFilter';
import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

import { asBrainHookEventOfClaudeEvent } from './asBrainHookEventOfClaudeEvent';

/**
 * .what = the declared hook a manifest rule reads back as
 * .why = the sync diffs declared hooks against what it finds; a rule reads back as the claude
 *   adapter read a settings hook back — timeout in seconds, a `*` matcher as no
 *   filter — so a re-sync of an unchanged role finds every hook unchanged
 *
 * .note = `when` reads back too, so a hook declared `when: 'after'` diffs as unchanged
 */
export const asBrainHookOfHookDispatchRule = (input: {
  rule: HookDispatchRule;
}): BrainHook => {
  const { rule } = input;
  const hasFilter = rule.matcher !== '*' || rule.when !== null;
  return new BrainHook({
    author: rule.author,
    event: asBrainHookEventOfClaudeEvent({ event: rule.event }),
    command: rule.command,
    timeout: { seconds: rule.timeoutSeconds },
    ...(hasFilter && {
      filter: new BrainHookFilter({
        what: rule.matcher,
        ...(rule.when && { when: rule.when }),
      }),
    }),
  });
};
