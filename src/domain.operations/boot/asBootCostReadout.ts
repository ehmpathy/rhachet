import type { BootSource } from '@src/domain.operations/boot/BootSource';
import { calcBudgetPercentUsed } from '@src/domain.operations/boot/calcBudgetPercentUsed';
import type { BootPayload } from '@src/domain.operations/boot/genBootPayload';
import type { BootCostRow } from '@src/domain.operations/boot/getAllCostRows';
import { formatTokens } from '@src/utils/formatTokens';
import { getOneTokensColumnWidth } from '@src/utils/getOneTokensColumnWidth';
import { getOneTreeElbow } from '@src/utils/getOneTreeElbow';

/**
 * .what = a share of the payload, as a percent with one decimal — always
 * .why = `5` and `5.0` are the same number and two column widths, and a column that steps
 *        mid-list is a blemish a reader reads as a defect
 *        (`rule.forbid.snapshot-visual-blemishes`).
 *
 * 🔴 .note = it is ONE owner for every share this readout prints, chrome and rank alike, so
 *   the chrome share and the rank column always render in one format.
 */
const asPercent = (input: { tokens: number; total: number }): string =>
  ((input.tokens / input.total) * 100).toFixed(1);

/**
 * .what = what a set of rows costs, together
 * .why = this readout folds the same sum at TWO sites that mean opposite things — the tail a
 *        capped list hides, and the chrome the ranked column does not own. each was an inline
 *        `reduce` a reader had to simulate to know which quantity it produced
 *        (`rule.require.named-transformers`).
 *
 * 🔴 .note = one name over both sites is what makes this readout's final claim CHECKABLE:
 *   *"the column plus chrome is the total"* reads as `sumRowTokens(rows) + tokensChrome ===
 *   counted.tokens`, which holds by construction. two independently-typed folds would state
 *   the same identity in a shape a reader must match up by eye.
 */
const sumRowTokens = (rows: BootCostRow[]): number =>
  rows.reduce((sum, row) => sum + row.tokens, 0);

/**
 * .what = the token count of each row, in row order
 * .why = the tokens column width is a property of the rows shown, so it reads these counts
 */
const getAllTokensOfRows = (input: { rows: BootCostRow[] }): number[] =>
  input.rows.map((row) => row.tokens);

/**
 * .what = the label a ranked row prints — a say row's path, or a ref row's xml tag
 * .why = a ref batch is a whole block (`<briefs.ref>`, `<also>`), never a file. a bare
 *        `also` beside a column of paths reads as a file named `also`; the tag form names
 *        the block exactly as the payload spells it, so a reader can find it there
 */
const asCostRowLabel = (row: BootCostRow): string =>
  row.kind === 'ref' ? `<${row.slug}>` : row.slug;

/**
 * .what = the heaviest rows, with the tail summed rather than dropped
 * .why = a capped list that does not say what it capped reports a payload smaller than the
 *        one it measured (`rule.forbid.failhide`)
 */
const asRankLines = (input: {
  rows: BootCostRow[];
  limit: number;
  total: number;
}): string[] => {
  const shown = input.rows.slice(0, input.limit);
  const rest = input.rows.slice(input.limit);
  const tokensRest = sumRowTokens(rest);

  // one width over every row a reader will see, tail included, so the column cannot step
  const widthTokens = getOneTokensColumnWidth({
    counts: [...getAllTokensOfRows({ rows: shown }), tokensRest],
  });

  // .note = the share is derived from the row's TOKENS rather than read off a precomputed
  //   `percent`, so the tail row below needs no sum of rounded percents — an operation that
  //   accrues each row's own error into one visibly wrong total
  const asRow = (row: {
    elbow: string;
    tokens: number;
    slug: string;
  }): string =>
    `      ${row.elbow} ${formatTokens({ tokens: row.tokens }).padStart(widthTokens)}  ${asPercent(
      { tokens: row.tokens, total: input.total },
    ).padStart(4)}%  ${row.slug}`;

  const length = rest.length ? shown.length + 1 : shown.length;
  const linesShown = shown.map((row, index) =>
    asRow({
      tokens: row.tokens,
      slug: asCostRowLabel(row),
      elbow: getOneTreeElbow({ index, length }),
    }),
  );
  if (!rest.length) return linesShown;

  return [
    ...linesShown,
    asRow({
      elbow: '└─',
      tokens: tokensRest,
      slug: `… ${rest.length} more`,
    }),
  ];
};

/**
 * .what = renders what a boot costs, and where the tokens go
 * .why = the budget halt names no file by design — the gate sees cost and never value, so the
 *        CHOICE is the author's. this is the surface that hands them the cost half of that
 *        choice on demand, before a halt rather than after one.
 *
 * 🔴 .note = the total is the BOOT's own, counted by the gate's own counter over the gate's
 *   own render. so `roles cost` and `roles boot` report one number rather than two that
 *   agree by luck.
 */
export const asBootCostReadout = (input: {
  payload: BootPayload;
  counted: { tokens: number };
  rows: BootCostRow[];
  source: BootSource;
  limit: number;
}): string[] => {
  const { payload, counted, rows } = input;
  const countOf = (kind: 'say' | 'ref'): number =>
    payload.batches.filter((batch) => batch.kind === kind).length;

  // the residual no batch owns: the stats blocks and xml chrome, a roughly fixed cost, net of
  // the tokens that span a join seam between two batches
  const tokensChrome = counted.tokens - sumRowTokens(rows);

  return [
    // the COST verb, never the source's `invocation`, which names the boot
    `🧢 roles cost ${input.source.coordinates}`,
    `   ├─ tokens  = ${formatTokens({ tokens: counted.tokens })} (full emitted payload, o200k_base)`,
    payload.budget
      ? `   ├─ budget  = ${formatTokens({ tokens: payload.budget.tokens })} tokens (${calcBudgetPercentUsed(
          { payload: counted, budget: payload.budget },
        )}% used)`
      : `   ├─ budget  = none declared — this boot is uncapped`,
    `   ├─ batches = ${countOf('say')} say · ${countOf('ref')} ref`,
    `   ├─ chrome  = ${formatTokens({ tokens: tokensChrome })} tokens (${asPercent(
      {
        tokens: tokensChrome,
        total: counted.tokens,
      },
    )}%) — stats blocks, xml, join seams`,
    `   │`,
    `   └─ where the tokens go`,
    ...asRankLines({ rows, limit: input.limit, total: counted.tokens }),
    ``,
    // the column is the TUNE surface, so it holds only what an author can act on. chrome is a
    // floor the renderer imposes, so it is reported above rather than ranked among rows an
    // author could cut
    `   .note = the column plus chrome is the total. chrome is the renderer's own floor —`,
    `           no edit to a say or ref entry reaches it.`,
    ``,
  ];
};
