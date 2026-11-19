import { BrainHook } from '@src/domain.objects/BrainHook';

/**
 * .what = the fields of a hook its identity rests on, as `BrainHook.unique` declares them
 */
export type HookUnique = Pick<BrainHook, (typeof BrainHook.unique)[number]>;

/**
 * .what = whether a hook carries a given identity: each field of `BrainHook.unique` matches
 * .why = the sync, the manifest adapter and the take-back each compare hooks by identity; one
 *   predicate, read off the domain object's own declaration, keeps them on one key
 */
export const isHookOfUnique = (input: {
  hook: HookUnique;
  unique: HookUnique;
}): boolean =>
  BrainHook.unique.every((field) => input.hook[field] === input.unique[field]);
