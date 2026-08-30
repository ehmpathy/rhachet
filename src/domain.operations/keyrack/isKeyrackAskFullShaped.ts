import type { KeyrackKeyAsk } from '@src/domain.objects/keyrack/KeyrackKeyAsk';

import { isValidKeyrackEnv } from './constants';

/**
 * .what = whether a key ask already carries its own org+env segments — i.e. it is a full SLUG
 *   (`@all.prep.KEY`) or a full ADDRESS (`@all.prep.KEY@casey@ahction.com`), rather than the bare
 *   key name (`KEY`) that still needs a prefix built onto it
 * .why = `KeyrackKeyAsk` sanctions three shapes and the cli hands `--key` through untouched, so
 *   every path that expands an ask must first agree on WHICH shape it holds. read as a raw
 *   `includes('.')` at the point of use, that agreement is a decode step a reader re-derives —
 *   and one a second call site can silently answer differently
 *
 * .note = ⛔ this is the exact question whose two independent answers produced the i007 defect:
 *   one branch rebuilt `@all.{env}.` onto an ask that ALREADY carried it, yielding the doubled
 *   `@all.{env}.@all.{env}.KEY` that can never match — so a key held only at reaches came back
 *   `absent`. one named answer, shared, cannot drift apart again
 *
 * .note = ⚠️ the test is `>= 3 segments AND segment[1] is a real env` — the STRICTEST of the four
 *   answers this repo carries, and deliberately the one adopted. it is `asKeyrackKeySlug`'s own
 *   `parseFullSlug` test, which is where `KeyrackKeyAsk`'s doc comment already points callers.
 *   the weaker `includes('.')` it replaces answers YES to a bare key name that merely holds a dot
 *   (`MY.TOKEN`), and the caller then skips the prefix build the ask genuinely needed — the same
 *   shape as the i007 defect, merely on the other side of the branch
 * .note = an ADDRESS still answers YES: `@all.prep.KEY@casey@ahction.com` splits to
 *   `['@all','prep','KEY@casey@ahction','com']`, so the env segment is intact and the reach's own
 *   dots only inflate the count. the address is never REBUILT from those parts — the split is a
 *   shape TEST, never a parse (`term=address`)
 * .note = two peer sites still answer this question by their own algorithms:
 *     - `getAllSudoSlugsForKeyAsk`  — dot AND the manifest holds it (couples shape to existence)
 *     - `filterSlugsByKeyAsk`       — suffix match, never a segment count
 *   to converge them is the right end state and is NOT done here: each serves a path this repair
 *   holds no acceptance clamp over, so a changed test there would move behavior with no clamp
 *   ready to catch a regression. the drift map is recorded HERE, at the named answer, so the next
 *   traveler finds it rather than rediscovers it
 */
export const isKeyrackAskFullShaped = (input: {
  ask: KeyrackKeyAsk | null;
}): boolean => {
  if (!input.ask) return false;
  const segments = input.ask.split('.');
  return segments.length >= 3 && isValidKeyrackEnv(segments[1]!);
};
