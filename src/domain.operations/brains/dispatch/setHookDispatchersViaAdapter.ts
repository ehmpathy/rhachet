import { BrainHook } from '@src/domain.objects/BrainHook';
import { BrainHookFilter } from '@src/domain.objects/BrainHookFilter';
import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';
import { isHookAuthorOfRole } from '@src/domain.operations/brains/isHookAuthorOfRole';

import { asBrainHookEventOfClaudeEvent } from './asBrainHookEventOfClaudeEvent';
import { asHookDispatchersOfRules } from './asHookDispatchersOfRules';
import { asTimeoutSecondsOfBrainHook } from './asTimeoutSecondsOfBrainHook';
import { HOOK_DISPATCH } from './constants';

/**
 * .what = hand the brain's own adapter one dispatcher hook per event, and take back every role
 *   hook it still holds
 * .why = the rules live in the manifest; a role hook left in the settings would run twice, once
 *   by itself and once inside the dispatcher
 *
 * .note = call it after the manifest is written, so a session that reads the settings mid-sync
 *   never meets a dispatcher whose manifest lacks its rules
 * .note = a hook with no role author (a hand-added one) is never touched
 * .note = a dispatcher hook already in place, the same in command, timeout and matcher, is
 *   left as is, so a re-sync writes naught
 */
export const setHookDispatchersViaAdapter = async (input: {
  adapter: BrainHooksAdapter;
  rules: HookDispatchRule[];
  manifestPathRel: string;
}): Promise<void> => {
  const { adapter } = input;

  // the dispatcher hooks these rules need
  const desired = asHookDispatchersOfRules({
    rules: input.rules,
    manifestPathRel: input.manifestPathRel,
  }).map((dispatcher) => asBrainHookOfHookDispatcher({ dispatcher }));

  // what the brain's settings hold now
  const found = await adapter.dao.get.all();

  // take back each role hook (a manifest rule) and each dispatcher no longer desired
  const toDel = found.filter((hook) => isHookToTakeBack({ hook, desired }));
  for (const hook of toDel)
    await adapter.dao.del({
      by: {
        unique: {
          author: hook.author,
          event: hook.event,
          command: hook.command,
        },
      },
    });

  // set each dispatcher whose body differs or is absent
  for (const want of desired) {
    const isInPlace = found.some((hook) => isSameBody(hook, want));
    if (!isInPlace) await adapter.dao.set.upsert({ hook: want });
  }
};

/**
 * .what = one dispatcher, as the brain hook the brain's adapter writes
 * .why = the adapter speaks BrainHook; a `*` matcher is a hook with no filter
 */
const asBrainHookOfHookDispatcher = (input: {
  dispatcher: ReturnType<typeof asHookDispatchersOfRules>[number];
}): BrainHook =>
  new BrainHook({
    author: HOOK_DISPATCH.author,
    event: asBrainHookEventOfClaudeEvent({ event: input.dispatcher.event }),
    command: input.dispatcher.command,
    timeout: { seconds: input.dispatcher.timeoutSeconds },
    ...(input.dispatcher.matcher !== '*' && {
      filter: new BrainHookFilter({ what: input.dispatcher.matcher }),
    }),
  });

/**
 * .what = whether a settings hook leaves: a role hook, or a dispatcher no longer desired
 * .why = a role hook runs as a manifest rule; a stale dispatcher would run a stale event
 */
const isHookToTakeBack = (input: {
  hook: BrainHook;
  desired: BrainHook[];
}): boolean => {
  if (isHookAuthorOfRole({ author: input.hook.author })) return true;
  if (input.hook.author !== HOOK_DISPATCH.author) return false;
  return !input.desired.some((want) => isSameHook(want, input.hook));
};

/**
 * .what = whether two hooks share their unique key: author, event and command
 */
const isSameHook = (left: BrainHook, right: BrainHook): boolean =>
  left.author === right.author &&
  left.event === right.event &&
  left.command === right.command;

/**
 * .what = whether two hooks match in key, timeout and matcher, so a rewrite would change naught
 */
const isSameBody = (left: BrainHook, right: BrainHook): boolean =>
  isSameHook(left, right) &&
  asTimeoutSecondsOfBrainHook({ timeout: left.timeout }) ===
    asTimeoutSecondsOfBrainHook({ timeout: right.timeout }) &&
  (left.filter?.what ?? '*') === (right.filter?.what ?? '*');
