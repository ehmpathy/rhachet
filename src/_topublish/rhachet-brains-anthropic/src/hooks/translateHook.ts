import { UnexpectedCodePathError } from 'helpful-errors';
import { toMilliseconds } from 'iso-time';

import type { BrainHook } from '@src/domain.objects/BrainHook';
import type { BrainHookEvent } from '@src/domain.objects/BrainHookEvent';

import type { ClaudeCodeHookEntry } from './config.dao';

/**
 * .what = valid boot event names for claude code
 * .why = used to validate filter.what for onBoot hooks
 */
const VALID_BOOT_EVENTS = [
  'SessionStart',
  'PreCompact',
  'PostCompact',
] as const;

/**
 * .what = maps rhachet BrainHookEvent to claude code hook event name
 * .why = claude code uses different event names than rhachet
 */
const EVENT_MAP: Record<BrainHookEvent, string> = {
  onBoot: 'SessionStart',
  onTool: 'PreToolUse',
  onStop: 'Stop',
  onTalk: 'UserPromptSubmit',
};

/**
 * .what = translates a rhachet BrainHook to claude code hook entry format
 * .why = bridges rhachet hook model to claude code settings.json structure
 */
export const translateHookToClaudeCode = (input: {
  hook: BrainHook;
}): { event: string; entry: ClaudeCodeHookEntry } => {
  const { hook } = input;

  // convert IsoDuration to milliseconds for claude code
  const timeoutMs = toMilliseconds(hook.timeout);

  // build the base hook entry (matcher determined per-event below)
  const buildEntry = (matcher: string): ClaudeCodeHookEntry => ({
    matcher,
    hooks: [
      {
        type: 'command',
        command: hook.command,
        ...(timeoutMs && { timeout: timeoutMs }),
      },
    ],
  });

  // for onBoot, filter.what determines which boot event to register under
  if (hook.event === 'onBoot') {
    const bootTrigger = hook.filter?.what ?? 'SessionStart';

    // validate boot trigger
    if (
      !VALID_BOOT_EVENTS.includes(
        bootTrigger as (typeof VALID_BOOT_EVENTS)[number],
      )
    ) {
      throw new UnexpectedCodePathError(
        `invalid filter.what value for onBoot: ${bootTrigger}`,
        { hook, validValues: VALID_BOOT_EVENTS },
      );
    }

    // boot events use wildcard matcher (no subject to match against)
    return { event: bootTrigger, entry: buildEntry('*') };
  }

  // for onTool, filter.when decides the claude event: 'after' fires on PostToolUse; the
  //   default ('before', or absent) fires on PreToolUse
  const matcher = hook.filter?.what ?? '*';
  if (hook.event === 'onTool' && hook.filter?.when === 'after')
    return { event: 'PostToolUse', entry: buildEntry(matcher) };

  // for onStop and onTalk, and onTool before, use the event map
  return { event: EVENT_MAP[hook.event], entry: buildEntry(matcher) };
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

  // handle boot events specially (PreCompact, PostCompact map to onBoot with filter)
  if (event === 'PreCompact' || event === 'PostCompact') {
    return entry.hooks.map((h) => ({
      author,
      event: 'onBoot' as BrainHookEvent,
      command: h.command,
      timeout: h.timeout ? { milliseconds: h.timeout } : { seconds: 30 },
      filter: { what: event },
    }));
  }

  // PostToolUse maps to onTool with filter.when='after' (PreToolUse is the default, 'before')
  if (event === 'PostToolUse') {
    return entry.hooks.map((h) => ({
      author,
      event: 'onTool' as BrainHookEvent,
      command: h.command,
      timeout: h.timeout ? { milliseconds: h.timeout } : { seconds: 30 },
      // a filter names its `what` always; a declared after-hook carries one
      filter: { what: entry.matcher, when: 'after' as const },
    }));
  }

  // reverse map event name for other events
  const rhachetEvent = Object.entries(EVENT_MAP).find(
    ([, v]) => v === event,
  )?.[0] as BrainHookEvent | undefined;

  if (!rhachetEvent) return [];

  // each hook in the entry becomes a separate BrainHook
  // for SessionStart (onBoot), no filter means backwards compat
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
