import { ConstraintError } from 'helpful-errors';

import { asBootOverageLines } from './asBootOverageLines';
import {
  asBootSubjectMarginLines,
  type BootSubjectMargin,
} from './asBootSubjectMarginLines';
import { asBudgetStrategyLines } from './asBudgetStrategyLines';
import { getAllBudgetStrategies } from './getAllBudgetStrategies';

/**
 * .what = the refusal rung a budget breach earns
 * .why = `halt` where the caller can act, `warn` where they cannot. a linked role's spec is
 *        a symlink into a version-pinned store, so every remedy would name a file the
 *        caller cannot write — and a halt with no remedy is a dead end, never a gate.
 */
export type BootBudgetRung = 'halt' | 'warn';

/**
 * .what = the english word for a small count — `4` → `four`
 * .why = the fix line states how many rungs the ladder beneath it carries, and that count is
 *        ALREADY computed by `getAllBudgetStrategies`. a word written by hand is a second,
 *        independently-typed statement of one number, and it drifts the moment the ladder
 *        changes length. so the word is DERIVED from the list it describes.
 *
 * .note = an out-of-range count falls back to its digits rather than a throw. a render must
 *   not refuse to render — `12 strategies` reads correctly, where a throw would replace the
 *   one surface the author needs with a malfunction.
 */
export const asCountWord = (input: { count: number }): string =>
  (
    ({
      1: 'one',
      2: 'two',
      3: 'three',
      4: 'four',
      5: 'five',
      6: 'six',
      7: 'seven',
      8: 'eight',
      9: 'nine',
    }) as Record<number, string | undefined>
  )[input.count] ?? String(input.count);

/**
 * .what = renders the caller-visible surface of a budget breach
 * .why = an error that states a symptom alone is a blocker
 *        (`rule.require.errors-name-the-fix`). so the breach names the overage AND the
 *        moves that close it — `0.wish.md` requirement 3.
 *
 * .note = it names THAT some resources must go, and never WHICH. the gate can see a
 *   resource's COST and not its VALUE — a 2,000-token brief may be the one document the
 *   whole role rests on, and a 300-token one may be dead weight. so advice sorted by cost
 *   is advice sorted by the one quantity uncorrelated with the decision. the choice is the
 *   author's, because they are the only party who holds the other half of it.
 *
 * .note = one breach shape this ladder cannot close: a ref-dominated payload stays over
 *   budget after every `say` resource is gone, since no rung shrinks the ref roster. open,
 *   with its measurement, at `.dream/2026_09_22.the-halt-cannot-close-a-ref-dominated-breach.dream.md`.
 */
export const asBootBudgetReadout = (input: {
  rung: BootBudgetRung;
  invocation: string;
  budget: { tokens: number };
  payload: { tokens: number };
  mode: 'simple' | 'subject';

  /**
   * .what = the flags that address this boot, so the halt can name the cost command for IT
   * .why = the halt names THAT some resources must go and never WHICH — the gate sees cost
   *        and never value, so the choice is the author's. but a choice needs data, and the
   *        author has none on screen: the halt reports one total over a payload of many
   *        parts. so it hands them the instrument rather than the answer.
   *
   * .note = required, because every `BootSource` carries one — gate 1's registry walk too,
   *   as the `--what <path>` to the spec it measured
   */
  coordinates: string;

  /**
   * .what = the subjects this render included, and what a drop of each recovers
   * .why = `narrow` heads the ladder in subject mode, and an author cannot take a rung they
   *        cannot price. see `asBootSubjectMarginLines` for why it names subjects and never
   *        resources, and `BootPayloadSubjects` for why the number is a margin.
   *
   * .note = absent wherever the caller could not measure it — a simple-mode spec has no
   *   subject, and the `warn` rung renders no ladder at all
   *
   * 🔴 .note = `inScope` and `margins` are SEPARATE fields because only the second needs a
   *   filesystem re-walk. so a fault in that walk costs the PRICES and never the NAMES, and the
   *   block still names which `--subject` arguments the `narrow` rung would take.
   */
  subjects: {
    inScope: string[];
    margins: BootSubjectMargin[] | null;
    fault: string | null;
  } | null;
}): string[] => {
  // a foreign spec: say it, and proceed. the caller cannot write the file a fix would name
  if (input.rung === 'warn')
    return [
      `🧢 ${input.invocation}`,
      `   ├─ 🟡 over budget — and this spec is not yours to trim`,
      // .note = `declared upstream`, never a path. the spec is a symlink into a
      //   version-pinned store, so the path it resolves to is one the reader cannot act on
      //   and would read as an invitation to try
      ...asBootOverageLines({
        budget: input.budget,
        payload: input.payload,
        declaredIn: 'declared upstream',
      }),
      `   │`,
      // .note = "not refused" rather than "the boot proceeds" — TWO gates share this readout,
      //   and only one of them boots. at `repo introspect` no boot is underway, so a line
      //   that named one would describe an event the reader never saw.
      `   └─ not refused — the spec is a symlink into a version-pinned store,`,
      `      so every remedy would name a file this repo cannot write`,
      ``,
    ];

  const strategies = getAllBudgetStrategies({ mode: input.mode });

  return [
    `🧢 ${input.invocation}`,
    // 🔴 .note = the glyph and the class are ONE read, off the constructor
    //   `assertBootWithinBudget` throws exactly this class two lines later, so the tree node a
    //   human reads first must name it too — `rule.require.unabridged-error-prefix` grades a
    //   stderr glyph with no class a blocker, and its own target shape puts the prefix INSIDE
    //   an indented node rather than flush-left.
    //
    //   ⚠️ the pair is read off `ConstraintError` rather than typed as a literal. two
    //   independent statements of one pair drift, and the drift ships `✋ MalfunctionError` —
    //   the exact defect that rule's 👎 example records. `error.name` is NOT a usable source
    //   (`HelpfulError` never assigns `this.name`), so the CLASS is the read.
    `   ├─ ${ConstraintError.emoji} ${ConstraintError.name}: over budget`,
    // ⚠️ one owner for the trio, so both rungs carry the same labels, units, and glyphs by
    //   construction rather than by two edits that must agree
    //   (`rule.forbid.domain-term-inconsistency`). `declaredIn` is the sole difference
    ...asBootOverageLines({
      budget: input.budget,
      payload: input.payload,
      declaredIn: 'declared in boot.yml',
    }),
    `   │`,
    // .note = `resources`, never `say resources`: the ref roster can dominate the payload, so a
    //   say trim alone may not close the breach
    `   ├─ some resources must go — you choose which`,
    // the instrument, never the answer. the gate can sort by COST, and the author is the
    // only party who holds VALUE — so the halt hands them the measurement and stops there.
    // `rhx cost` is the dispatcher's alias for `roles cost` (`bin/run.bun`, clamped by
    // `run.dispatch.acceptance` [case3])
    `   │  └─ rhx cost ${input.coordinates}   sorts every batch by what it costs`,
    `   │`,
    // 🔴 the roster that makes `narrow` — the ladder's first rung in subject mode — a rung the
    //    author can PRICE rather than merely read. it names the argument to `--subject`, never
    //    a document: see `asBootSubjectMarginLines` for the line between those two units
    ...(input.subjects?.inScope.length
      ? [...asBootSubjectMarginLines(input.subjects), `   │`]
      : []),
    // .note = the count is DERIVED from the ladder the next line renders, so the two cannot
    //   disagree. see `asCountWord` for why a hand-written word was the defect
    `   └─ fix — ${asCountWord({ count: strategies.length })} strategies, cheapest first`,
    ...asBudgetStrategyLines({ strategies }),
    ``,
  ];
};
