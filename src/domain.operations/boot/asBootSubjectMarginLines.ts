import { formatTokens } from '@src/utils/formatTokens';
import { getOneColumnWidth } from '@src/utils/getOneColumnWidth';
import { getOneTokensColumnWidth } from '@src/utils/getOneTokensColumnWidth';
import { getOneTreeElbow } from '@src/utils/getOneTreeElbow';

/**
 * .what = one subject in scope, and what a drop of it recovers
 * .why = the pair is read at two sites — the gate measures it, the render aligns it — so it
 *        is a declared shape rather than a positional tuple decoded by index
 */
export interface BootSubjectMargin {
  slug: string;

  /**
   * the tokens the payload falls by if this ONE subject is dropped
   *
   * 🔴 .note = a MARGIN, never an attributed share. see `BootPayloadSubjects`.
   */
  tokens: number;
}

/**
 * .what = the roster block a subject-mode breach renders — which subjects were in scope, and
 *   what a drop of each recovers
 *
 * .why = the ladder's first rung is `narrow` — *"boot fewer --subject sections"* — and the
 *        roster prices each subject so the author can pick which one to drop
 *
 * 🔴 .note = it names SUBJECTS and never RESOURCES. a subject is the argument to `--subject`,
 *   so its row names a move; the gate sees a resource's cost and never its value, so it
 *   ranks no document (see `asBootBudgetReadout`).
 *
 * ⚠️ .note = the header says what a drop RECOVERS, never "costs". the two read alike and are
 *   not: the margins do NOT sum to the payload, because a resource two subjects both say is
 *   recovered by neither alone, and `always:` plus the xml chrome survive every drop.
 *
 * .note = the column is padded by COMPUTE over the widest slug. a hand-aligned column drifts
 *   the moment a slug changes length, and the misalignment surfaces only in a snapshot
 *   (`rule.forbid.snapshot-visual-blemishes`).
 *
 * .note = the roster names WHICH subjects were in scope and the per-subject cost, and only
 *   the cost needs a filesystem re-walk. so a fault in the
 *   re-walk costs the SECOND clause alone: `inScope` still names the subjects, and the reader
 *   still learns which `--subject` arguments the ladder's `narrow` rung would take.
 *
 *   ⇒ the degradation is DISCLOSED rather than swallowed. a roster that silently shed its
 *   prices would read as "these subjects cost naught", which is an advisory that misstates its
 *   own effect (`rule.forbid.failhide`). the fault's message rides the line that replaces them.
 */
export const asBootSubjectMarginLines = (input: {
  /** the priced roster, or `null` where the re-walk faulted */
  margins: BootSubjectMargin[] | null;

  /** the subjects the render was built for — known WITHOUT any walk */
  inScope: string[];

  /** what went wrong in the re-walk, or `null` where it did not */
  fault: string | null;
}): string[] => {
  const { margins, inScope, fault } = input;

  // a roster of none names no move; the ladder's `narrow` rung already stands alone
  if (inScope.length === 0) return [];

  // 🔴 the walk faulted: name the subjects, and say plainly that the prices are absent and why.
  //    the halt itself is unaffected — the breach was established before this block was reached
  if (!margins)
    return [
      `   ├─ in scope — ${inScope.length === 1 ? '1 subject' : `${inScope.length} subjects`}: ${inScope.join(', ')}`,
      `   │  └─ 🟡 what a drop of ${inScope.length === 1 ? 'it' : 'each'} recovers could not be measured — ${fault ?? 'unknown fault'}`,
    ];

  if (margins.length === 0) return [];

  const widthSlug = getOneColumnWidth({
    cells: getAllSlugsOfMargins({ margins }),
  });

  // the token column right-aligns too, so a reader compares magnitudes down the column
  // rather than across ragged digits
  const widthTokens = getOneTokensColumnWidth({
    counts: getAllTokensOfMargins({ margins }),
  });

  // .note = the singular reads `it`, never `each`. "a drop of each" over one row is the
  //   template's plural shown through, and a header that reads as boilerplate is one a
  //   reader discounts (`rule.forbid.snapshot-visual-blemishes`)
  const header =
    margins.length === 1
      ? `   ├─ in scope — 1 subject, and what a drop of it recovers`
      : `   ├─ in scope — ${margins.length} subjects, and what a drop of each recovers`;

  return [
    header,
    ...margins.map((margin, index) => {
      const elbow = getOneTreeElbow({ index, length: margins.length });
      // .note = the sign is parted from the digits by a fixed space, so a short count does
      //   not leave the `−` hard against one row and adrift on the next
      const tokens = formatTokens({ tokens: margin.tokens }).padStart(
        widthTokens,
      );
      return `   │  ${elbow} ${margin.slug.padEnd(widthSlug)}  − ${tokens} tokens`;
    }),
  ];
};

/**
 * .what = the slug column of a margin roster
 * .why = names the projection the column width is computed over
 */
const getAllSlugsOfMargins = (input: {
  margins: BootSubjectMargin[];
}): string[] => input.margins.map((margin) => margin.slug);

/**
 * .what = the token column of a margin roster
 * .why = names the projection the column width is computed over
 */
const getAllTokensOfMargins = (input: {
  margins: BootSubjectMargin[];
}): number[] => input.margins.map((margin) => margin.tokens);
