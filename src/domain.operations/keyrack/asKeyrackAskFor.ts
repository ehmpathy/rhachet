import type { PickOne } from 'type-fns';

/**
 * .what = read WHAT an ask names — one key, or the whole repo — from the flags a human spelled
 * .why = the shape is a three-branch fork (`--for repo` outranks `--key`, and a bare ask names
 *        neither), and it was spelled out inline at every keyrack verb that builds a grant
 *        context. a fork a reader must simulate to learn "this is the ask's scope" is
 *        decode-friction in an orchestrator (`rule.forbid.inline-decode-friction`)
 *
 * .why.named = its peers (`asKeyrackAskOrg`, `asKeyrackSelectorOrg`, `asKeyrackFilterOrg`) were
 *              each extracted for the same reason. a rule that lives in a call site is re-derived
 *              per call site, and the call site that derives it differently is the defect
 *
 * ⚠️ .the invariant, stated as an invariant = EVERY keyrack verb that reads an ask's scope reads
 *        it here, and a verb added later must too. stated as a RULE rather than as a headcount
 *        on purpose: a count ("the last such fork", "all three call sites") tells the next reader
 *        the search is over, which is the opposite of what an extraction is for — it survives
 *        exactly until the next caller, and then reads as a fact while it is false. a rule
 *        survives a new caller; a census does not
 *
 * ⚠️ .note = `--for repo` OUTRANKS `--key`. an ask that carries both is a sweep, because the
 *         sweep was asked for explicitly and the downstream read honors that
 *         (the `get` verb in `invokeKeyrack.ts` reasons from the same precedence). to flip this
 *         order would silently narrow a sweep to one key
 *
 * .note = a BARE ask returns null, never a default. what "no flags" denotes is the VERB's fact,
 *         not this cast's: `get` treats it as an unstated ask (the builder then loads the
 *         manifest, as every extant caller does), while a bare `source` IS a repo sweep. to
 *         bake either default in here would impose one verb's sense on the other
 */
export const asKeyrackAskFor = (input: {
  /**
   * .what = the `--for` value, or null when the verb declares no such flag or it was omitted
   * .why = REQUIRED-nullable per `rule.forbid.undefined-inputs` — `source` has no `--for` of
   *        this sense, and that absence must be stated rather than inferred
   */
  for: string | null;

  /** .what = the `--key` value, or null when omitted */
  key: string | null;
}): PickOne<{ keys: string[]; repo: true }> | null => {
  // an explicit sweep outranks a key named beside it
  if (input.for === 'repo') return { repo: true };

  // a named key is a keyed ask
  if (input.key) return { keys: [input.key] };

  // neither named — the verb decides what a bare ask denotes
  return null;
};
