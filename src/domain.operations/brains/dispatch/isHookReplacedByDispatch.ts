import { isHookAuthorOfRole } from '@src/domain.operations/brains/isHookAuthorOfRole';

import { HOOK_DISPATCH } from './constants';

/**
 * .what = whether a settings hook is one the dispatch shape replaces: a role hook (it runs as a
 *   manifest rule) or a dispatcher (it is rewritten from the rules)
 * .why = every writer of dispatcher settings must drop the same hooks; a role hook kept beside a
 *   dispatcher runs twice. the sync's take-back and the actor derive's pure transform share this
 */
export const isHookReplacedByDispatch = (input: {
  hook: { author?: string | null };
}): boolean =>
  input.hook.author === HOOK_DISPATCH.author ||
  isHookAuthorOfRole({ author: input.hook.author ?? '' });
