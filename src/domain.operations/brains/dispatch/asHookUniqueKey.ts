import { BrainHook } from '@src/domain.objects/BrainHook';

/**
 * .what = a hook's identity as one string: the fields of `BrainHook.unique`, joined by `|`
 * .why = a map keyed by identity (the actor tally) needs a string; read off the same declaration
 *   as `isHookOfUnique`, so the two cannot disagree on what one hook is
 * .note = the fields are plain strings, so a caller keyed in claude's event names (a settings
 *   file, a manifest row) builds the key without a cast into the rhachet event vocabulary
 */
export const asHookUniqueKey = (input: {
  hook: Record<(typeof BrainHook.unique)[number], string>;
}): string => BrainHook.unique.map((field) => input.hook[field]).join('|');
