import { ConstraintError } from 'helpful-errors';

import type { KeyrackKeyReach } from '@src/domain.objects/keyrack';
import { asKeyrackKeyReachFromFlag } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachFromFlag';

import { emitKeyrackBlockedReport } from './emitKeyrackBlockedReport';

/**
 * .what = parse the `--reach` flag for a cli command, or render the turtle-blocked report
 * .why = the vision specifies the blocked tree for a malformed reach (e2–e5) — the same render
 *        every other reach refusal already uses (e6, e14). the bare parse threw OUTSIDE each
 *        command's guard block, so those cases fell through to the generic cli handler and
 *        surfaced as a raw `ConstraintError:` dump trailed by an `[args] keyrack,unlock,…`
 *        echo. one command, two refusal renders, picked by which flag a human got wrong —
 *        the inconsistency `rule.forbid.ambiguous-labels` and nielsen's heuristic 4 forbid
 *
 * .why one home = the flag is parsed at FIVE command boundaries (get, source, set, del,
 *        unlock). five hand-written try/catches is the same "one rule stated five ways" shape
 *        that `assertKeyrackReachRequiresKey` was extracted to end, and a sixth command added
 *        later would silently inherit the raw dump again
 *
 * .note = ⚠️ the return is WRAPPED, and it has to be: `asKeyrackKeyReachFromFlag` already uses
 *         `undefined` to mean "no `--reach` was given", which is the common case and entirely
 *         legal. so a bare `KeyrackKeyReach | undefined` could not tell an absent flag from a
 *         refused one, and every caller would read a refusal as a reachless ask — a silent
 *         widen of exactly the sweep q2 exists to refuse. the outer `null` is the refusal;
 *         the inner `reach` is the value, absent or not
 * .note = the two sentinels are deliberately DIFFERENT words. `undefined` stays the inner
 *         one because e16 turns on it: unlock's `--json` is a bare `JSON.stringify`, which
 *         drops `undefined` and keeps `null` — so a reachless key's json is byte-identical to
 *         what it was before this feature only while the absent case is `undefined`. `null`
 *         is therefore free to carry the outer, unrelated sense
 * .note = the outer `null` is a SIGNAL, never a swallow: the report is already on stderr and
 *         `process.exitCode` is already 2 by the time it returns, and the type names the null
 *         so a caller cannot ignore it without the compiler's consent. an error of any other
 *         class rethrows untouched (`rule.forbid.failhide`)
 * .note = the caller keeps its own `return`, per `emitKeyrackBlockedReport`'s declared
 *         contract that control flow belongs to the call site
 */
export const asKeyrackKeyReachOrEmitBlocked = (input: {
  flag: string | undefined;
  command: string;
}): { reach: KeyrackKeyReach | undefined } | null => {
  try {
    return { reach: asKeyrackKeyReachFromFlag({ flag: input.flag }) };
  } catch (error) {
    // only a constraint is a rendered refusal; a malfunction is a defect and must surface
    if (!(error instanceof ConstraintError)) throw error;

    emitKeyrackBlockedReport({ error, command: input.command });
    return null;
  }
};
