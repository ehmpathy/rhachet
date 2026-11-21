import { MalfunctionError } from 'helpful-errors';

import type { BrainHookEvent } from '@src/domain.objects/BrainHookEvent';

import { CLAUDE_EVENT_OF_BRAIN_HOOK_EVENT } from './constants';

/**
 * .what = the claude hook event a rhachet hook event lands under, as the claude adapter maps it
 * .why = the dispatcher runs per claude event; a rule must sit under the event claude fires it on
 */
export const asClaudeEventOfBrainHookEvent = (input: {
  event: BrainHookEvent;
}): string => {
  const found = CLAUDE_EVENT_OF_BRAIN_HOOK_EVENT[input.event];
  if (!found)
    throw new MalfunctionError('hook event has no claude event', {
      event: input.event,
    });
  return found;
};
