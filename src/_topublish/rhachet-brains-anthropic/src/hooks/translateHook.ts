import { toMilliseconds } from 'iso-time';

import type { BrainHook } from '@src/domain.objects/BrainHook';
import type { BrainHookEvent } from '@src/domain.objects/BrainHookEvent';

import type { ClaudeCodeHookEntry } from './config.dao';

/**
 * .what = maps rhachet BrainHookEvent to claude code hook event name
 * .why = claude code uses different event names than rhachet
 */
const EVENT_MAP: Record<BrainHookEvent, string> = {
  onBoot: 'SessionStart',
  onTool: 'PreToolUse',
  onStop: 'Stop',
};

/**
 * .what = translates a rhachet BrainHook to claude code hook entry format
 * .why = bridges rhachet hook model to claude code settings.json structure
 */
export const translateHookToClaudeCode = (input: {
  hook: BrainHook;
}): { event: string; entry: ClaudeCodeHookEntry } => {
  const { hook } = input;

  // determine the matcher based on filter
  const matcher = hook.filter?.what ?? '*';

  // convert IsoDuration to milliseconds for claude code
  const timeoutMs = toMilliseconds(hook.timeout);

  // build the claude code hook entry
  const entry: ClaudeCodeHookEntry = {
    matcher,
    hooks: [
      {
        type: 'command',
        command: hook.command,
        ...(timeoutMs && { timeout: timeoutMs }),
      },
    ],
  };

  return {
    event: EVENT_MAP[hook.event],
    entry,
  };
};

/**
 * .what = translates a claude code hook entry back to rhachet BrainHook
 * .why = enables read of hooks from claude code settings
 */
export const translateHookFromClaudeCode = (input: {
  event: string;
  entry: ClaudeCodeHookEntry;
  author: string;
}): BrainHook[] => {
  const { event, entry, author } = input;

  // reverse map event name
  const rhachetEvent = Object.entries(EVENT_MAP).find(
    ([, v]) => v === event,
  )?.[0] as BrainHookEvent | undefined;

  if (!rhachetEvent) return [];

  // each hook in the entry becomes a separate BrainHook
  return entry.hooks.map((h) => ({
    author,
    event: rhachetEvent,
    command: h.command,
    timeout: h.timeout ? { milliseconds: h.timeout } : { seconds: 30 },
    ...(entry.matcher !== '*' && {
      filter: { what: entry.matcher },
    }),
  }));
};
