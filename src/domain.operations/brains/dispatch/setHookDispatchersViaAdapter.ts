import { BrainHook } from '@src/domain.objects/BrainHook';
import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';
import { isHookAuthorOfRole } from '@src/domain.operations/brains/isHookAuthorOfRole';

import { asBrainHookEventOfClaudeEvent } from './asBrainHookEventOfClaudeEvent';
import { asHookDispatchersOfRules } from './asHookDispatchersOfRules';
import { asTimeoutSecondsOfBrainHook } from './asTimeoutSecondsOfBrainHook';
import { HOOK_DISPATCH } from './constants';
import { isHookOfUnique } from './isHookOfUnique';
import { isHookReplacedByDispatch } from './isHookReplacedByDispatch';

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
 * .note = `rules: null` means no manifest: every dispatcher is taken back, since one named at an
 *   absent manifest would refuse every call
 */
export const setHookDispatchersViaAdapter = async (input: {
  adapter: BrainHooksAdapter;
  rules: HookDispatchRule[] | null;
  manifestPathRel: string;
}): Promise<{
  dispatchers: number;
  dispatchersSet: number;
  dispatchersTakenBack: number;
  roleHooksTakenBack: number;
}> => {
  const { adapter } = input;

  // the dispatcher hooks these rules need
  const desired = asHookDispatchersOfRules({
    rules: input.rules,
    manifestPathRel: input.manifestPathRel,
  }).map((dispatcher) => asBrainHookOfHookDispatcher({ dispatcher }));

  // what the brain's settings hold now
  const found = await adapter.dao.get.all();

  // set each dispatcher whose body differs or is absent, first: a seat that spawns mid-swap then
  //   meets a rule twice (once as a role hook, once in the dispatcher), never a guard gap
  const toSet = desired.filter(
    (want) => !found.some((hook) => isSameBody(hook, want)),
  );
  for (const want of toSet) await adapter.dao.set.upsert({ hook: want });

  // then take back each role hook (it runs as a manifest rule now) and each dispatcher no longer
  //   desired. the settings hold no role hook after any sync, so a rule never runs twice, even
  //   where an older rhachet wrote per-rule hooks back
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

  // what changed, so the sync can report the shape it wrote
  return {
    dispatchers: desired.length,
    dispatchersSet: toSet.length,
    dispatchersTakenBack: toDel.filter(
      (hook) => hook.author === HOOK_DISPATCH.author,
    ).length,
    roleHooksTakenBack: toDel.filter((hook) =>
      isHookAuthorOfRole({ author: hook.author }),
    ).length,
  };
};

/**
 * .what = one dispatcher, as the brain hook the brain's adapter writes
 * .why = the adapter speaks BrainHook; every dispatcher is `*`, a hook with no filter
 */
const asBrainHookOfHookDispatcher = (input: {
  dispatcher: ReturnType<typeof asHookDispatchersOfRules>[number];
}): BrainHook =>
  new BrainHook({
    author: HOOK_DISPATCH.author,
    event: asBrainHookEventOfClaudeEvent({ event: input.dispatcher.event }),
    command: input.dispatcher.command,
    timeout: { seconds: input.dispatcher.timeoutSeconds },
  });

/**
 * .what = whether a settings hook leaves: a role hook, or a dispatcher no longer desired
 * .why = a role hook runs as a manifest rule; a stale dispatcher would run a stale event
 */
const isHookToTakeBack = (input: {
  hook: BrainHook;
  desired: BrainHook[];
}): boolean => {
  if (!isHookReplacedByDispatch({ hook: input.hook })) return false;
  if (input.hook.author !== HOOK_DISPATCH.author) return true;
  return !input.desired.some((want) => isSameHook(want, input.hook));
};

/**
 * .what = whether two hooks share their unique key: author, event and command
 */
const isSameHook = (left: BrainHook, right: BrainHook): boolean =>
  isHookOfUnique({ hook: left, unique: right });

/**
 * .what = whether two hooks match in key, timeout and matcher, so a rewrite would change naught
 * .note = the matcher counts: a found dispatcher with a filter (a union wire a prior sync wrote)
 *   differs from the desired `*`, so the sync rewrites it in place
 */
const isSameBody = (left: BrainHook, right: BrainHook): boolean =>
  isSameHook(left, right) &&
  asTimeoutSecondsOfBrainHook({ timeout: left.timeout }) ===
    asTimeoutSecondsOfBrainHook({ timeout: right.timeout }) &&
  (left.filter?.what ?? '*') === (right.filter?.what ?? '*');
