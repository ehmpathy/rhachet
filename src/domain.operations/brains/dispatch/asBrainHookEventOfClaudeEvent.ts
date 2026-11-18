import { MalfunctionError } from 'helpful-errors';

import type { BrainHookEvent } from '@src/domain.objects/BrainHookEvent';

import {
  BRAIN_HOOK_EVENTS,
  CLAUDE_EVENT_OF_BRAIN_HOOK_EVENT,
} from './constants';

/**
 * .what = the rhachet hook event a claude hook event reads back as
 * .why = a manifest rule names its claude event; the sync diffs in rhachet's own events
 */
export const asBrainHookEventOfClaudeEvent = (input: {
  event: string;
}): BrainHookEvent => {
  const found = BRAIN_HOOK_EVENTS.find(
    (event) => CLAUDE_EVENT_OF_BRAIN_HOOK_EVENT[event] === input.event,
  );
  if (!found)
    throw new MalfunctionError('claude event has no hook event', {
      event: input.event,
    });
  return found;
};
