import { ConstraintError } from 'helpful-errors';

import type { BootBudget } from '@src/domain.objects/RoleBootSpec';

import { getOneBrainTokenCounter } from '../brainCost/getOneBrainTokenCounter';
import {
  asBootBudgetReadout,
  type BootBudgetRung,
} from './asBootBudgetReadout';
import type { BootSubjectMargin } from './asBootSubjectMarginLines';
import type { BootPayloadMeasurable } from './BootPayloadMeasurable';
import { calcBootPayloadTokens } from './calcBootPayloadTokens';
import { calcBudgetOverage } from './calcBudgetOverage';
import type { BootPayloadSubjects } from './genBootPayload';
import { isWalkVanishFault } from './isWalkVanishFault';

/**
 * .what = refuses a boot whose payload exceeds the budget its spec declared
 * .why = a payload grows in silence, and the cheapest moment to trim one is the moment
 *        somebody authors it. a warn offers no such moment — the cost is visible to
 *        nobody and the payload grows anyway (`0.wish.md` requirement 2).
 *
 * .note = it runs BEFORE a byte of the payload is emitted, which is requirement 2 read
 *   strictly: a halt that first prints the payload has already spent the tokens it
 *   refuses to authorize. so the caller assembles to a buffer, gates, then flushes.
 *
 * .note = the rung is COMPUTED per spec, never a constant — `halt` where the caller can
 *   write the file a fix would name, `warn` where they cannot (requirement 8). see
 *   `isBootSpecForeign` and `define.invariant.a-symlink-under-agent-is-foreign`.
 *
 * .note = an undeclared budget returns before the counter is ever reached, so the
 *   tokenizer is not loaded at all — an unbudgeted boot pays naught for this operation.
 *
 * .note = it RETURNS the count it gated on, so the stats block reports the same number the
 *   gate enforced. a second tokenization would be both a cost and a chance to disagree.
 *   null means "no budget declared", the case the stats block renders as an unlimited budget.
 *
 * 🔴 .note = it takes the BODY and the stats RENDERER rather than a finished string, because
 *   the gated payload includes the two stats blocks the boot emits — and each of those
 *   reports the very number the gate computes. the self-reference is settled by
 *   `calcBootPayloadTokens`; the gate's job is to hold the caller to the whole render rather
 *   than to a part of it (requirement 7).
 */
export const assertBootWithinBudget = async (input: {
  of: BootPayloadMeasurable;
  budget: BootBudget | null;
  rung: BootBudgetRung;
  invocation: string;
  mode: 'simple' | 'subject';

  /**
   * .what = the flags that address this boot, so the halt names the cost command for IT —
   *         see `asBootBudgetReadout`
   */
  coordinates: string;

  /**
   * .what = the subject roster this render included, with the closure that re-measures it
   * .why = the ladder's first rung in subject mode is `narrow`, so the halt prices each
   *        subject the author could drop
   *
   * .note = it is priced ONLY on a breach, so an under-budget boot pays naught for it. the
   *   re-plans are real filesystem work, and a boot that passes needs no remedy at all
   */
  subjects: BootPayloadSubjects | null;
}): Promise<{ tokens: number } | null> => {
  // no budget declared: naught to gate, and the tokenizer stays unloaded
  if (!input.budget) return null;

  // 🔴 the boundary is crossed HERE, below the budget check, and nowhere deeper. this
  //    operation is the gate — an orchestrator — so it is the right grain to reach a
  //    communicator, and `calcBootPayloadTokens` stays a pure compute leaf that receives
  //    the counter. ⇒ the unbudgeted perf shield is this `return null` above, so the
  //    load's position relative to it is the whole invariant, and it is stated once here.
  const countTokens = await getOneBrainTokenCounter({ memo: null });
  const counted = calcBootPayloadTokens({ of: input.of }, { countTokens });
  if (counted.tokens <= input.budget.tokens) return { tokens: counted.tokens };

  /**
   * .what = what a drop of each in-scope subject would recover, in tokens
   * .why = the MARGIN is the only honest per-subject number — `BootPayloadSubjects` carries
   *        why an attributed share cannot be computed at all under the plan's dedupe.
   *
   * 🔴 .note = it runs only past the breach check above, so it is off the happy path entirely.
   *   each slug costs one re-plan plus one tokenize, and the encoder is the one already
   *   constructed above — the ~1.8s construction is paid once per process, never per subject.
   *
   * .note = a re-plan that yields null is a payload that emits naught, so the drop recovers
   *   the WHOLE count. that is a true read rather than a fallback: a roster of one whose spec
   *   curates naught under `always:` really does collapse to an empty boot.
   *
   * 🔴 .note = the re-walk is the one catch in the gate. `genPayloadWithout` walks the
   *   filesystem, so a moved or vanished tree can fault here, after the breach is proven.
   *   the roster only prices the `narrow` rung, so such a fault renders as its own disclosed
   *   line beside the named subjects, and the boot still refuses with exit 2.
   */
  const getAllSubjectMargins = async (): Promise<{
    margins: BootSubjectMargin[] | null;
    fault: string | null;
  }> => {
    const roster = input.subjects;
    if (!roster) return { margins: [], fault: null };

    try {
      // 🟡 .note = deliberate mutation — one accumulator, scoped to this try. the drops run in
      //   sequence, so each re-render holds the tokenizer alone rather than N at once
      const margins: BootSubjectMargin[] = [];
      for (const slug of roster.inScope) {
        const without = await roster.genPayloadWithout({ slug });
        const tokensWithout = without
          ? calcBootPayloadTokens({ of: without }, { countTokens }).tokens
          : 0;

        // a drop that costs MORE than the whole means the tree moved between the two reads;
        // the difference of two trees is no margin, so it rides out as a disclosed fault
        if (tokensWithout > counted.tokens)
          throw new ConstraintError(
            'the boot tree moved while subject margins were priced — re-run for fresh margins',
            { slug, tokens: counted.tokens, tokensWithout },
          );
        margins.push({ slug, tokens: counted.tokens - tokensWithout });
      }
      return { margins, fault: null };
    } catch (error) {
      // an allowlist: a moved or vanished tree, or any caller-fixable ConstraintError the
      //   re-walk raised, is disclosed beside the breach with its own message; all else rethrows
      if (!isWalkVanishFault(error)) throw error;

      // the fault fills ONE tree row, and a HelpfulError's message appends its metadata on the
      //   lines below the first, so the row takes the first line alone, as asBootSpecUnreadableLines does
      return { margins: null, fault: error.message.split('\n')[0] ?? '' };
    }
  };

  /**
   * .what = the subject roster the readout prices, empty on the `warn` rung
   * .why = the `warn` rung returns before the ladder is reached, so the roster is measured
   *        only where it will be read. a foreign spec pays for no re-plan at all
   */
  const getOneSubjectRosterForReadout = async (): Promise<{
    margins: BootSubjectMargin[] | null;
    fault: string | null;
    inScope: string[];
  }> => {
    if (input.rung === 'warn') return { margins: [], fault: null, inScope: [] };
    return {
      ...(await getAllSubjectMargins()),
      inScope: input.subjects?.inScope ?? [],
    };
  };

  // the human surface: the overage, then the moves that close it. stderr, never stdout —
  // a machine that pipes stdout must get a clean payload or naught at all
  for (const line of asBootBudgetReadout({
    rung: input.rung,
    invocation: input.invocation,
    budget: input.budget,
    payload: { tokens: counted.tokens },
    mode: input.mode,
    coordinates: input.coordinates,
    subjects: await getOneSubjectRosterForReadout(),
  }))
    console.error(line);

  // a foreign spec: the warn is the whole refusal. every remedy would name a file this
  // repo cannot write, so a halt here would be a dead end rather than a gate
  if (input.rung === 'warn') return { tokens: counted.tokens };

  // .note = the metadata is what an sdk caller branches on; the readout above is stderr prose
  //
  // 🔴 .note = the `hint` is SELF-CONTAINED, never a pointer at the readout. a line like
  //   "the strategies are named above" is true on the cli and false everywhere else — an sdk
  //   caller has no "above". so it names the moves in its own words, and a reader who holds
  //   only the error still holds a fix (`rule.require.errors-name-the-fix`).
  throw new ConstraintError('boot payload exceeds its declared budget', {
    // .note = `a resource`, never `a say resource` — the same correction the readout carries,
    //   for the same reason: a ref roster can dominate a payload, and a hint that names only
    //   the say set points an sdk caller at a trim that cannot close their breach
    //
    // .note = subject mode leads with `narrow`, the same first rung the readout's ladder shows
    hint: `${input.mode === 'subject' ? 'boot fewer --subject sections, or ' : ''}trim a resource — catalogize a set, condense or ref a say entry, list one under \`not\` — or raise budget.tokens deliberately`,
    budget: input.budget.tokens,
    payload: counted.tokens,
    over: calcBudgetOverage({
      payload: { tokens: counted.tokens },
      budget: input.budget,
    }),
  });
};
