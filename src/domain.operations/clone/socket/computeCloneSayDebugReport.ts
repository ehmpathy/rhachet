import type { CloneScreenLive } from '../screen/genCloneScreenFeed';
import type { CloneGetReply } from './asCloneGetReply';
import type { CloneSayBaseline } from './computeCloneSayBaseline';
import type {
  CloneSayObservation,
  CloneSayOutcome,
} from './computeCloneSayVerdict';

/**
 * .what = one observe-loop cycle, captured verbatim — the transcript rise and the whole
 *   probe reply that cycle read
 * .why = a verdict is decided from a SEQUENCE of reads, not one. an `absent` says only
 *   "no rise held anywhere"; the sequence says WHICH read failed and WHEN — a box that
 *   went dirty at cycle 12, a count that never moved, a probe that went blind mid-poll.
 *   the reply is kept WHOLE (state + grid) rather than reduced, so the log holds the same
 *   bytes the decision read rather than a summary of them
 */
export interface CloneSayDebugCycle {
  /** 0-based poll cycle index */
  cycle: number;
  /** ms elapsed since the dispatch write, so a lag is legible against the poll interval */
  sinceDispatchMs: number;
  /** did the transcript submit-count exceed the baseline at this cycle (the `released` basis) */
  transcriptRose: boolean;
  /** the whole probe reply this cycle read — classification, and the grid when asked for */
  reply: CloneGetReply;
}

/**
 * .what = the whole input set a say verdict was decided from, plus the rendered screens
 *   behind it
 * .why = the read channel reports a VERDICT and discards the classification it came from,
 *   so a `withheld` or an `absent` against a live clone is undiagnosable from the CLI alone
 *   — measured 2026-09-16, where three dispatches that demonstrably landed all reported
 *   `absent` and two rival causes could not be parted (F15's cost). this capture is the
 *   instrument that parts them: the baseline, every cycle's read, the decided outcome, and
 *   the exact grid rows the classifier saw
 */
export interface CloneSayDebugCapture {
  /** iso timestamp of the dispatch */
  at: string;
  /** the address as shown to the human (`@:slug` or `@:serial`) */
  address: string;
  serial: string;
  slug: string | null;
  /** the dispatched message, verbatim — it is also the needle both counts tally */
  message: string;
  /** did the caller pass `--force` (overrides a dirty box at the server pre-check) */
  force: boolean;
  /** the `--await` target the poll ran toward */
  target: string;
  /** the poll bound, in ms */
  timeoutMs: number;
  /** the pre-dispatch baseline every rise is measured against */
  baseline: CloneSayBaseline;
  /** the pre-dispatch probe reply the baseline was derived from */
  baselineReply: CloneGetReply;
  /** the observation the verdict was computed from */
  observation: CloneSayObservation;
  /** the decided verdict */
  outcome: CloneSayOutcome;
  /** every observe cycle, in order — empty for a `withheld` refusal (no observe runs) */
  trail: CloneSayDebugCycle[];
}

/**
 * .what = a dispatch that never reached a verdict at all — `sayClone` THREW, so no
 *   observation and no outcome were ever computed
 * .why = 🔴 the six say verdicts are each decided AFTER `sayClone` resolves. a reach fault
 *   (`wedged`, `exited-mid-dispatch`) is raised BY `sayClone`, so it bypasses the verdict
 *   machinery — and with it the whole capture above. measured 2026-09-18: a joker run wedged
 *   twice at exactly 30000ms while both messages demonstrably LANDED, and wrote no capture
 *   at all. so the one failure class that blocks a reliable say was the one class with no
 *   instrument (rule.forbid.failhide — an undiagnosable failure is a hidden one)
 *
 * .note = it carries the SAME pre-dispatch half as a verdict capture — the baseline and its
 *   probe reply are computed BEFORE the throw, so the BEFORE screen is always available. that
 *   is the whole diagnostic value: a wedge is read by a diff of its before-screen against the
 *   before-screen of a dispatch that succeeded
 */
export interface CloneSayReachFaultCapture {
  /** iso timestamp of the dispatch */
  at: string;
  /** the address as shown to the human (`@:slug` or `@:serial`) */
  address: string;
  serial: string;
  slug: string | null;
  /** the dispatched message, verbatim */
  message: string;
  /** did the caller pass `--force` */
  force: boolean;
  /** the `--await` target the poll would have run toward */
  target: string;
  /** the poll bound, in ms — never reached, since the throw preceded the observe */
  timeoutMs: number;
  /** the pre-dispatch baseline, computed before the throw */
  baseline: CloneSayBaseline;
  /** the pre-dispatch probe reply — the BEFORE screen, always present */
  baselineReply: CloneGetReply;
  /** the fault `sayClone` raised, in place of a verdict */
  fault: {
    /** the error class name — `MalfunctionError`, `ConstraintError`, … */
    class: string;
    /** the error message, verbatim */
    message: string;
    /** the clone reach state the fault reported, when it carried one */
    reachState: string | null;
    /** the reach cause slug the fault reported, when it carried one */
    reachCause: string | null;
    /** ms from the dispatch write to the throw — what parts a bound from an instant fault */
    sinceDispatchMs: number;
  };
}

/**
 * .what = every shape `writeCloneSayDebugLog` can append — a decided verdict, or a reach
 *   fault that preempted one
 * .why = one log, one writer, one path. a second writer would drift from this one's header,
 *   baseline, and grid render, and a reader parts a fault from a success by eye
 */
export type CloneSayLogCapture =
  | CloneSayDebugCapture
  | CloneSayReachFaultCapture;

/**
 * .what = is this capture a reach fault rather than a decided verdict
 * .why = the discriminant is the `fault` field's PRESENCE rather than a `kind` tag, so the
 *   extant verdict capture is untouched — no fixture, no snapshot, and no caller moves to
 *   add the fault arm (rule.require.review-test-changes)
 */
export const isCloneSayReachFaultCapture = (
  capture: CloneSayLogCapture,
): capture is CloneSayReachFaultCapture => 'fault' in capture;

/**
 * .what = render a count that may be unmeasured
 * .why = a probe-blind baseline collapses to `null`, NEVER `0` (r006-i010-b1), and that
 *   distinction decides whether any rise can be asserted at all. `0` in a log would read
 *   as "the screen held none", which is the exact confusion the null guard exists to
 *   prevent — so the log spells the unmeasured case out rather than print a bare `null`
 */
const asCount = (value: number | null): string =>
  value === null ? 'unmeasured (probe-blind)' : String(value);

/**
 * .what = render one probe reply's CLASSIFICATION — the five fields a verdict reads
 * .why = the raw counts are what a rise is computed from, so the log prints them beside
 *   the baseline rather than the derived boolean alone; a reader then checks the
 *   subtraction themselves rather than trust the rise flag
 *
 * .note = `queued` is printed LAST and is not a count — it is the field that parts `enqueued`
 *   from `released`, and it is read off one dim screen marker rather than computed. so a reader
 *   who diagnoses a wrong verdict needs it beside the grid it was read from: a `queued=true` with
 *   no queue hint visible in the printed grid is a classifier defect, and a `queued=false` on a
 *   grid that plainly shows the hint is the same defect in the other direction
 */
const asReplyLine = (reply: CloneGetReply): string =>
  reply.probe === 'capable'
    ? `probe=capable focus=${reply.state.focus} input=${reply.state.input} countInInput=${reply.state.countInInput} countOnScreen=${reply.state.countOnScreen} queued=${reply.state.queued}`
    : `probe=unsupported reason=${reply.reason}`;

/**
 * .what = render a rendered grid verbatim, one row per line, with row indices and a right
 *   edge marker — the full grid, then the BRIGHT-ONLY grid beside it
 * .why = this is the literal ask: the exact snapshot the emulator handed the classifier.
 *   row indices matter because the classifier's band math is index-relative (the input
 *   band is between the last two full-width rules, and the viewport starts at
 *   `lines.length - rows`), so a reader must see which index each row sits at to check
 *   the band the classifier picked. `│` marks the row end so a blank tail is legible
 *
 * .note = 🔴 the bright-only grid is printed because it is the SIGNAL the dirty/clear
 *   decision now turns on, and it is invisible in the rendered text. the classifier calls a
 *   box `clear` when its bright-only content is empty — the claim that a DIM cell is
 *   brain-drawn chrome and a default-intensity cell is a human's typed work. so a reader who
 *   sees only rendered text cannot part the two live causes of one `input-region-dirty`:
 *   "the brain drew a suggestion and we failed to read it as dim" versus "the brain drew it
 *   BRIGHT, so no dim signal existed". measured 2026-09-18 — that exact question cost a
 *   dispatch and a code read, which is the cost this block removes
 *
 *   a row that is blank HERE and non-blank above is dim — brain chrome. a row present in
 *   both is bright — a human's work, or a brain that drew at default intensity
 */
const asGridBlock = (input: {
  title: string;
  grid: CloneScreenLive;
}): string => {
  const { grid } = input;
  const head = [
    `   ${input.title}`,
    `   cols=${grid.cols} rows=${grid.rows} cursor=(x:${grid.cursorX},y:${grid.cursorY}) viewportRows=${grid.lines.length}`,
    '   ┌─────',
  ];
  // row 0 is the TOP OF THE VIEWPORT, never the top of the emulator buffer — the wire
  // clamps the grid to the viewport (asCloneGetReplyFromScreen), because that window is
  // precisely what computeCloneInputState reads. so these indices line up with the ones
  // the classifier used, and a reader can count rules down from row 0 the way it does
  const body = grid.lines.map(
    (line, index) => `   ${String(index).padStart(4, ' ')} │${line}│`,
  );

  // the same rows at BRIGHT intensity only, at the SAME indices — the wire clamps both grids
  // with one window, so index N here is index N above. a dim cell renders as a space, so a
  // brain-drawn row collapses to blank while a human's row survives verbatim
  const bright = [
    '',
    `   ${input.title} — BRIGHT ONLY (dim cells blanked; this is what the dirty/clear read sees)`,
    '   ┌─────',
    ...grid.linesBright.map(
      (line, index) => `   ${String(index).padStart(4, ' ')} │${line}│`,
    ),
    '   └─────',
  ];

  return [...head, ...body, '   └─────', ...bright].join('\n');
};

/**
 * .what = the grid to show for one end of the poll, with an honest note when there is none
 * .why = the grid is optional on the wire (`debug`), and a probe-blind reply carries no
 *   grid at all. an absent grid must SAY so — a silently empty section would read as "the
 *   screen was blank", which is the same false read `feed-not-live` exists to prevent (V7)
 */
const asGridSection = (input: {
  title: string;
  reply: CloneGetReply | null;
}): string => {
  if (input.reply === null)
    return `   ${input.title}\n   (no probe ran at this point)`;
  if (input.reply.probe !== 'capable')
    return `   ${input.title}\n   (probe-blind: ${input.reply.reason} — the feed handed back no grid)`;
  if (input.reply.grid === undefined)
    return `   ${input.title}\n   (the reply carried a classification but no grid — an older daemon, or a grid the wire parse rejected)`;
  return asGridBlock({ title: input.title, grid: input.reply.grid });
};

/**
 * .what = render a whole say-failure capture into the debug log body
 * .why = a failure verdict is a one-word answer to a question with many inputs. this
 *   prints every input, in the order the decision read them, so the next unexplained
 *   verdict is settled by one file read rather than six dispatches and a guess
 *
 * .note = PURE — string in, string out, no clock and no filesystem. so the whole render
 *   is clamped at the unit grain, and the i/o half (`writeCloneSayDebugLog`) owns only
 *   the path and the append
 */
/**
 * .what = the header every capture opens with — the dispatch's identity, under a title the
 *   caller names
 * .why = shared by BOTH arms so a reader diffs a fault against a success line for line. the
 *   only field that differs is the title, so it is the only parameter
 */
const asHeaderBlock = (input: {
  title: string;
  capture: CloneSayLogCapture;
}): string[] => {
  const { capture } = input;
  return [
    `═══ clone say — ${input.title} ═══`,
    `at            ${capture.at}`,
    `address       ${capture.address}`,
    `serial        ${capture.serial}`,
    `slug          ${capture.slug ?? '(none)'}`,
    `message       ${JSON.stringify(capture.message)}`,
    `force         ${capture.force}`,
    `await target  ${capture.target}`,
    `poll bound    ${capture.timeoutMs}ms`,
  ];
};

/**
 * .what = the pre-dispatch baseline block
 * .why = shared by both arms. a reach fault's baseline is computed before the throw, so it
 *   is exactly as complete as a verdict's — and it is the half a wedge diagnosis reads
 */
const asBaselineBlock = (input: { capture: CloneSayLogCapture }): string[] => {
  const { baseline, baselineReply } = input.capture;
  return [
    '',
    '── the pre-dispatch baseline (every rise above is measured against THIS) ──',
    `transcriptCount  ${baseline.transcriptCount}`,
    `countInInput     ${asCount(baseline.countInInput)}`,
    `countOnScreen    ${asCount(baseline.countOnScreen)}`,
    `baseline reply   ${asReplyLine(baselineReply)}`,
  ];
};

/**
 * .what = render a reach-fault capture — a dispatch that threw before any verdict existed
 * .why = the wedge is the failure class that blocks a reliable say, and it was the one class
 *   with no instrument. this prints what IS known at the throw: the identity, the fault and
 *   its elapsed time, the baseline, and the BEFORE screen the classifier saw. what it does
 *   NOT print is stated outright — a silent absent section would read as an empty screen
 *
 * .note = PURE — string in, string out, no clock and no filesystem, same as its verdict peer
 */
export const computeCloneSayReachFaultReport = (input: {
  capture: CloneSayReachFaultCapture;
}): string => {
  const { capture } = input;
  const { fault } = capture;

  return [
    ...asHeaderBlock({ title: 'REACH FAULT (no verdict)', capture }),
    '',
    '── the fault, in place of a verdict ──',
    `class            ${fault.class}`,
    `message          ${fault.message}`,
    `reachState       ${fault.reachState ?? '(none)'}`,
    `reachCause       ${fault.reachCause ?? '(none)'}`,
    `threw after      ${fault.sinceDispatchMs}ms from the dispatch write`,
    '',
    '── what this capture does NOT hold, and why ──',
    'no verdict, no observation, no observe trail, and no AFTER screen: `sayClone` threw,',
    'so the observe loop never ran. every one of the six verdicts is decided downstream of',
    'that call, so a reach fault bypasses them all. the BEFORE screen below is the whole',
    'diagnostic — read it against the BEFORE screen of a dispatch that succeeded.',
    ...asBaselineBlock({ capture }),
    '',
    '── the rendered screen, verbatim (the LIVE VIEWPORT — the rows the classifier read) ──',
    '',
    asGridSection({
      title: 'BEFORE the dispatch (the baseline probe)',
      reply: capture.baselineReply,
    }),
    '',
    '═══ end ═══',
    '',
  ].join('\n');
};

/**
 * .what = the ONE label column the decision block aligns every row to
 * .why = the width of its longest label, `screen.countOnScreenRose` (24 chars). named rather
 *   than hand-spaced so a new field cannot silently re-split the column
 */
const DECISION_LABEL_WIDTH = 24;

/**
 * .what = one `label   value` row of the decision block, at the shared column
 * .why = 🟡 the flat fields and the `screen.*` subgroup previously aligned at two DIFFERENT
 *   columns (17 and 26) inside one block, which reads as a misalignment rather than a nest —
 *   the `screen.` prefix already marks the nest, so a second column carries no information and
 *   costs a reader one re-scan of the block to see the groups are related. computed from one
 *   width rather than spaced by hand, so the alignment is a property of the code rather than a
 *   promise a later edit can break
 */
const asDecisionRow = (label: string, value: string): string =>
  `${label.padEnd(DECISION_LABEL_WIDTH, ' ')}  ${value}`;

export const computeCloneSayDebugReport = (input: {
  capture: CloneSayDebugCapture;
}): string => {
  const { capture } = input;
  const { outcome, observation } = capture;

  // the LAST cycle is the one the verdict was decided on — the poll returns terminal-or-
  // again, so whichever cycle ended the loop carries the read every screen verdict used
  const cycleLast = capture.trail.at(-1) ?? null;

  const header = asHeaderBlock({ title: outcome.verdict, capture });

  const verdictBlock = [
    '',
    '── the verdict ──',
    `verdict       ${outcome.verdict}`,
    `reason        ${outcome.reason ?? '(none)'}`,
    `probe         ${outcome.probe}`,
    `delivered     ${outcome.delivered}`,
  ];

  const decisionBlock = [
    '',
    '── the inputs the verdict was computed from ──',
    asDecisionRow(
      'refusal',
      observation.refusal ?? '(none — the bytes reached the pty)',
    ),
    asDecisionRow('transcriptRose', String(observation.transcriptRose)),
    asDecisionRow(
      'probeReason',
      observation.probeReason ?? '(none — the read was capable)',
    ),
    observation.screen === null
      ? asDecisionRow(
          'screen',
          'null (probe-blind — no screen verdict was reachable)',
        )
      : [
          asDecisionRow('screen.focus', observation.screen.focus),
          asDecisionRow('screen.input', observation.screen.input),
          asDecisionRow(
            'screen.countInInputRose',
            String(observation.screen.countInInputRose),
          ),
          asDecisionRow(
            'screen.countOnScreenRose',
            String(observation.screen.countOnScreenRose),
          ),
          // 🔴 the field that parts `enqueued` from `released`, and the ONE line here that is
          // not a rise. a transcript rise proves SUBMIT alone (the brain writes the user turn to
          // the jsonl at submit — measured 2026-09-18), so a `transcriptRose true` beside a
          // `screen.queued true` is exactly the read that must land `enqueued` rather than
          // `released`. print them adjacent so that pair is legible in one glance
          asDecisionRow('screen.queued', String(observation.screen.queued)),
        ].join('\n'),
  ];

  const baselineBlock = asBaselineBlock({ capture });

  const trailBlock = [
    '',
    `── the observe trail (${capture.trail.length} cycles) ──`,
    ...(capture.trail.length === 0
      ? ['(no observe ran — a withheld refusal never reaches the poll)']
      : capture.trail.map(
          (cycle) =>
            `  #${String(cycle.cycle).padStart(3, ' ')} +${String(cycle.sinceDispatchMs).padStart(6, ' ')}ms transcriptRose=${cycle.transcriptRose} ${asReplyLine(cycle.reply)}`,
        )),
  ];

  const gridBlock = [
    '',
    '── the rendered screens, verbatim (the LIVE VIEWPORT — the rows the classifier read) ──',
    '',
    asGridSection({
      title: 'BEFORE the dispatch (the baseline probe)',
      reply: capture.baselineReply,
    }),
    '',
    asGridSection({
      title: `AFTER the dispatch (cycle #${cycleLast?.cycle ?? '-'} — the read the verdict was decided on)`,
      reply: cycleLast?.reply ?? null,
    }),
  ];

  return [
    ...header,
    ...verdictBlock,
    ...decisionBlock,
    ...baselineBlock,
    ...trailBlock,
    ...gridBlock,
    '',
    '═══ end ═══',
    '',
  ].join('\n');
};
