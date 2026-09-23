import type { CloneInputState } from './computeCloneInputState';
import {
  asBandContentLines,
  getInputBand,
  isRuleRow,
} from './computeCloneInputState';
import type { CloneScreenLive } from './genCloneScreenFeed';

/**
 * .what = the CONTENT of a clone's two input surfaces — the box a human types into, and the
 *   queue that holds what was submitted but not yet released
 * .why = `CloneInputState` grades those surfaces (`clear`/`dirty`, `queued`) and shows neither.
 *   that was enough for `say`, which only ever asks "may I write?" — and it left a human who
 *   was REFUSED with no way to see what refused them, short of a second say that may clobber
 *   it. this is the read that closes that (F15): the box's text, verbatim, on demand
 *
 * .note = the two fields name the first two states of the input triple
 *   (define.brain-cli-input-states): `buffer` is `buffered`, `queue` is `enqueued`. the third,
 *   `released`, is the transcript — a DISK read, so it is not on this wire at all
 */
export interface CloneInputContent {
  /**
   * .what = the input box's rows, chrome stripped, one row per line
   * .why = the box is a REGION, so a multi-line entry occupies several rows and a row-scoped
   *   read would show a human half their own text
   */
  buffer: string[];
  /**
   * .what = the rows that hold the brain's unreleased queue — empty whenever the queue is
   *   provably empty
   * .why = 🟡 a CANDIDATE set, never a proof of membership. the rows above the band hold a
   *   queued message and a released turn alike — measured 2026-09-18, and neither position nor
   *   intensity parts them (both render `❯ <text>` bright, in the same region). so this is
   *   gated on `state.queued`, the one provable signal there is: the queue is non-empty, so
   *   these rows are what it holds. with the queue empty the field is `[]` rather than a row
   *   labeled `queue` that is really a released turn
   */
  queue: string[];
}

/**
 * .what = whether a row carries no content at all
 * .why = one of the two boundaries the queue run is bounded by — the measured separator between
 *   the queue and the turn output above it (debug.2026-09-18.log, rows 16-18)
 */
const isBlankRow = (line: string): boolean => line.trim().length === 0;

/**
 * .what = whether a row FENCES the region above the band — a blank row, or another rule
 * .why = 🔴 the blank row alone is not a sufficient bound. it is what the real screen happened to
 *   render on 2026-09-18, and a queue that abuts the rule above it renders no blank row at all —
 *   measured against the stub's `busy` screen, where the walk then ran up into the PRIOR box's
 *   chrome and its placeholder. a rule is the same region boundary `getInputBand` itself rests
 *   on, so both stops come from the one structural signal rather than from a fixture's shape
 */
const isRegionBoundary = (line: string): boolean =>
  isBlankRow(line) || isRuleRow(line);

/**
 * .what = read the box and queue content off a rendered screen — pure, no i/o
 * .why = the content half of the read channel, split from the classification half so a routine
 *   `say` probe still carries a classification and no box bytes (the F02/F03 default). a caller
 *   opts in, and gets exactly the two INPUT surfaces — never the turn output above them, never
 *   the whole grid
 *
 * .note = it TAKES the state rather than recompute it. `queued` is the gate on the queue field,
 *   and `computeCloneInputState` is its single owner — a second read of the dim queue hint here
 *   would be a second owner of the one signal that parts `enqueued` from `released`
 */
export const computeCloneInputContent = (input: {
  screen: CloneScreenLive;
  state: CloneInputState;
}): CloneInputContent => {
  const band = getInputBand({ screen: input.screen });

  // no band = a modal replaced the box, or a screen we do not recognize. both report empty
  // rather than fall back to a wider slice: a read that cannot locate the box must say so by
  // showing zero rows, never by showing rows it cannot vouch for
  if (!band) return { buffer: [], queue: [] };

  // drop the fully-blank rows a short entry leaves at the band's foot, so a one-line box reads
  // as one line rather than one line and three empties
  const buffer = asBandContentLines(band.lines).filter(
    (line) => !isBlankRow(line),
  );

  // the queue renders ABOVE the band's top rule, bounded below by that rule and above by the
  // first region boundary. `queued` gates it — see the field's own note for why position cannot
  if (!input.state.queued) return { buffer, queue: [] };

  // .note = deliberate mutation — a bounded walk upward from the band's top rule, local here
  const queueRows: string[] = [];
  for (let y = band.top - 1; y >= 0; y--) {
    const line = input.screen.lines[y] ?? '';
    if (isRegionBoundary(line)) break;
    queueRows.unshift(line);
  }

  // a queue row can be blank-after-strip (a bare `❯` the brain drew), so the same foot filter the
  // box read takes applies here — a row with no content is chrome, never a held message
  return {
    buffer,
    queue: asBandContentLines(queueRows).filter((line) => !isBlankRow(line)),
  };
};
