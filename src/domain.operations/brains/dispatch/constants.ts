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
 * .note = `timeoutGraceSeconds` is how long a timed-out rule has after TERM before KILL, which no
 *   trap defers; it sits below `timeoutMarginSeconds`, so the dispatcher reaps a hung rule and
 *   still returns its verdicts before claude kills the dispatcher. `bin/hooks.dispatch.sh` holds
 *   the same value as `__rhx_dispatch_grace`
 */
export const HOOK_DISPATCH = {
  manifest: 'hooks.dispatch.manifest',
  author: 'rhachet/hooks.dispatch',
  bin: './node_modules/rhachet/bin/hooks.dispatch.sh',
  timeoutMarginSeconds: 5,
  timeoutGraceSeconds: 2,
} as const;

/**
 * .what = the shape of a matcher read as an exact list of tool names (`Bash|Write`, `Read,Edit`),
 *   never as a regex
 * .why = the sync (portability check, dispatcher matcher union) and the dispatcher bash must agree
 *   on which matchers are lists; `bin/hooks.dispatch.sh` holds the same pattern, and
 *   `constants.manifest-parity.integration.test.ts` goes red the day the two differ
 */
export const HOOK_DISPATCH_MATCHER_LIST = /^[A-Za-z0-9_|,]+$/;

/**
 * .what = the flags `rhachet run` parses for itself (`src/contract/cli/invokeRun.ts`)
 * .why = a hook command that passes one of these past the skill name may be read by rhx, not the
 *   skill; the sync runs such a command as declared, never guessed at
 * .note = a copy of a table another file owns; `constants.route-parity.integration.test.ts`
 *   goes red the day the two differ
 */
export const HOOK_DISPATCH_RUN_FLAGS: string[] = [
  '--skill',
  '-s',
  '--init',
  '-i',
  '--repo',
  '--role',
  '-r',
  '--attempts',
  '--help',
  '-h',
];

/**
 * .what = the first words `bin/rhx` sends to a command of its own, never to a skill
 * .note = a copy of a table another file owns; `constants.route-parity.integration.test.ts`
 *   goes red the day the two differ
 */
export const HOOK_DISPATCH_RHX_SHORT_CIRCUITS: string[] = [
  'help',
  'list',
  'boot',
  'cost',
  'keyrack',
  'upgrade',
  'enroll',
  'actor',
  'clone',
  'brains',
  'init',
];
