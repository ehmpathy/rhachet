import type { BrainHookEvent } from '@src/domain.objects/BrainHookEvent';

/**
 * .what = the claude hook event each rhachet hook event lands under, as the claude adapter maps it
 * .note = `filter.when: 'after'` still lands under PreToolUse, as the adapter places it today
 */
export const CLAUDE_EVENT_OF_BRAIN_HOOK_EVENT: Record<BrainHookEvent, string> =
  {
    onBoot: 'SessionStart',
    onTool: 'PreToolUse',
    onTalk: 'UserPromptSubmit',
    onStop: 'Stop',
  };

/**
 * .what = every rhachet hook event, as a list typed without a cast
 */
export const BRAIN_HOOK_EVENTS: BrainHookEvent[] = [
  'onBoot',
  'onTool',
  'onTalk',
  'onStop',
];

/**
 * .what = the names the hook dispatcher is known by
 * .why = the sync writes them, the derive narrows them, and the dispatcher reads them; one
 *   declaration keeps the three in step
 *
 * .note = `manifest` sits in each actor's brain dir, beside `settings.of.repo.json`
 *   (define.brain-dir-layout-is-one-for-every-actor: every actor's dir holds one)
 * .note = `author` names no role, so no role's narrow or prune ever claims a dispatcher hook
 * .note = `bin` is reached through the repo's own node_modules, as `./node_modules/.bin/rhx` is
 */
export const HOOK_DISPATCH = {
  manifest: 'hooks.dispatch.manifest',
  author: 'rhachet/hooks.dispatch',
  bin: './node_modules/rhachet/bin/hooks.dispatch.sh',
  timeoutMarginSeconds: 5,
  timeoutDefaultSeconds: 600,
} as const;
