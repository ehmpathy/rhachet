import type { CloneScreenLive } from './genCloneScreenFeed';

/**
 * .what = which surface holds the brain's focus right now — as a value that is the single
 *   source of truth for the type
 * .why = the write channel proceeds ONLY on `input` — a whitelist, so `modal` and
 *   `unrecognized` both refuse, and a fourth value added later refuses by construction (safe
 *   by default). the pre-check tests `focus` before `input`, so `--force` overrides a dirty
 *   region but never a modal (define.brain-cli-input-states). the type DERIVES from this
 *   tuple, so a new focus value is compiler-forced into the wire guard (r11-i018-n1)
 */
const CLONE_FOCUS_VALUES = ['input', 'modal', 'unrecognized'] as const;
export type CloneFocus = (typeof CLONE_FOCUS_VALUES)[number];

/**
 * .what = whether the input region carries content nobody dispatched — the source-of-truth tuple
 * .why = a `dirty` region is a human mid-type; a say that wrote there would paste over their
 *   work and submit both as one turn (case=2). `clear` = the placeholder or an empty box
 */
const CLONE_INPUT_REGION_VALUES = ['clear', 'dirty'] as const;
export type CloneInputRegion = (typeof CLONE_INPUT_REGION_VALUES)[number];

/**
 * .what = narrow an arbitrary wire value to a known focus / input-region — the guards live
 *   HERE, beside the type they check, never in the `asCloneGetReply` consumer that reads the
 *   wire (r11-i018-n2 scope-leak fix, mirrors CloneWithheldReason's producer-owned narrow)
 * .why = `asCloneGetReply` validates a `capable` payload off our own protocol; a corrupt
 *   `focus`/`input` from a buggy peer must fail loud there, so it narrows through these
 */
export const isCloneFocus = (value: unknown): value is CloneFocus =>
  typeof value === 'string' &&
  (CLONE_FOCUS_VALUES as readonly string[]).includes(value);

export const isCloneInputRegion = (value: unknown): value is CloneInputRegion =>
  typeof value === 'string' &&
  (CLONE_INPUT_REGION_VALUES as readonly string[]).includes(value);

/**
 * .what = the classified read of a clone's input surface — a classification, never bytes
 * .why = the socket returns THIS, not the screen content. the brain's screen holds the human's
 *   work; a verb that returned it would widen the socket into a session oracle (F02, F03).
 *   the counts are counts a caller compares across a pre/post baseline (the rise rule)
 */
export interface CloneInputState {
  /** which surface holds focus — the write channel's whitelist */
  focus: CloneFocus;
  /** whether the input region is `clear` or `dirty` (a human's uncommitted work) */
  input: CloneInputRegion;
  /** occurrences of the caller's message within the input-box band */
  countInInput: number;
  /** occurrences of the caller's message across the live viewport (never scrollback) */
  countOnScreen: number;
  /**
   * .what = the brain's queue is non-empty — at least one submitted message is held, unreleased
   * .why = the ONE signal that parts `enqueued` from `released`, and the transcript cannot supply
   *   it: the brain writes a user turn to the jsonl at SUBMIT, not at release (measured
   *   2026-09-18 — see the marker below), so a transcript rise proves submission and asserts
   *   naught about whether the turn was taken. without this field the `released` branch outranks
   *   `enqueued` on every busy dispatch, so `enqueued` is unreachable and `--await release`
   *   returns on a submit
   */
  queued: boolean;
}

/**
 * .what = a full-width horizontal rule — the brain draws the input box as a band between a pair
 * .why = the box locator rests on the two `─` rules that fence the `❯` row at the viewport foot
 *   (the measured structure, real haiku v2.1.87). half-width guards against a short divider
 * .note = EXPORTED because a rule is a REGION BOUNDARY, and the queue walk in
 *   `computeCloneInputContent` needs the same one. it walks upward from the band's top rule and
 *   must stop at the nearest boundary above — a blank row OR another rule. a walk that stopped
 *   only at a blank row would run into a prior box's chrome on any screen where the queue abuts
 *   the rule above it (measured against the stub's `busy` screen, which renders exactly that)
 */
export const isRuleRow = (line: string): boolean => {
  const trimmed = line.trim();
  return /^─+$/.test(trimmed) && trimmed.length >= 20;
};

/**
 * .what = one row of a numbered option list — `❯ 1. Review the diff`, or `  2. Run the tests`
 * .why = the two halves the above-band modal detector reads. group 1 captures the SELECTION GLYPH
 *   and group 2 the ordinal. the glyph is optional per row because a menu marks only its selected
 *   row with it; its peers are bare-indented — so the glyph is read across a run, never per row
 *   (see `hasOptionRun`)
 */
const OPTION_ROW = /^\s*(❯\s*)?(\d+)\.\s/;

/**
 * .what = whether a set of lines holds a SELECTABLE option menu — two adjacent rows whose numbers
 *   ascend by one (`1.` then `2.`), where one of the two carries the `❯` selection glyph
 * .why = each half alone is ambiguous, so both are required:
 *   - the ASCENT alone matches a bare `❯`, which a submitted user turn also renders in this region
 *     above the band's top rule (measured, claude v2.1.87 —
 *     5.1.execution.research.screens.captured.md:79)
 *   - the GLYPH alone matches an assistant's numbered PROSE reply, which is an ascent too.
 *     measured 2026-09-18 by `clone.modalprobe.realbrain.acceptance.test.ts`: a live claude
 *     answered a request for a numbered list, and the next `say` returned `withheld` /
 *     `modal-holds-focus` — a healthy peer gone deaf, and `modal` has no force path to recover it
 *   ⇒ a menu is an ascent the brain OFFERS, never merely one it WROTE
 * .note = the glyph is read across the adjacent PAIR, never the whole region: a selected row always
 *   participates in one adjacent pair, and a lone `❯ 1. …` turn cannot lend its glyph to an
 *   unrelated list
 * .note = a real interactive menu is caught independently by `MODAL_FOOTER_MARKERS`, which it must
 *   draw for a human to operate it — so the safety direction does not rest on this net alone
 * .note = the residual: a multi-line submitted turn whose first two lines read `1. …` / `2. …`
 *   renders as `❯ 1. …` / `  2. …` above the band, so it carries both an ascent and the glyph and
 *   classifies `modal`. the close is a position anchor (a live menu sits AT the viewport foot):
 *   .dream/2026_09_14.modal-detection-structural-over-marker-whitelist.dream.md
 */
const hasOptionRun = (lines: string[]): boolean =>
  lines.some((line, index) => {
    const here = OPTION_ROW.exec(line);
    if (here === null) return false;
    const next = OPTION_ROW.exec(lines[index + 1] ?? '');
    if (next === null) return false;
    if (Number(next[2]) !== Number(here[2]) + 1) return false;
    // the selection glyph on either row of the ascent — what parts an offered choice from a
    // written list. absent on both, the brain authored prose and awaits no answer
    return here[1] !== undefined || next[1] !== undefined;
  });

/**
 * .what = the footer a selection widget draws BENEATH its option list — the modal's own chrome
 * .why = a selection modal fences its OWN option list in a rule pair, so the box locator (which
 *   takes the LAST pair) captures the menu as the box, and the above-band scan then excludes the
 *   very rows that hold `❯ 1.`. measured 2026-09-17, live claude v2.1.87:
 *
 *     a normal input box          a selection modal
 *     ── rule ──                  ── rule ──
 *     ❯ Try "edit foo.ts…"        ☐ Next step
 *     ── rule ──                  Which would you like me to work on next?
 *     🗿 …87% of weekly limit     ❯ 1. Review the diff
 *                                   2. Run the test tiers
 *                                 ── rule ──
 *                                   4. Chat about this
 *                                 Enter to select · ↑/↓ to navigate · Esc to cancel
 *
 *   the footer survives that exclusion by construction: it sits BELOW the band's bottom rule, a
 *   region only the brain draws, since box content lives BETWEEN the rules. and it is present
 *   exactly while a choice is unresolved — a dismissed menu is redrawn, and a scrolled one holds
 *   its footer above the band
 * .note = `Esc to cancel` is absent from the set: a cancel hint is plausible on a non-modal
 *   surface (a turn in flight offers an interrupt), and `modal` has no force path, so a false
 *   positive makes a healthy clone permanently deaf. each marker means "a choice is unresolved",
 *   never "a key is bound"
 */
const MODAL_FOOTER_MARKERS: RegExp[] = [
  /\bEnter to select\b/i,
  /↑\/↓ to navigate/,
];

/**
 * .what = the placeholder text the brain greys into an empty box — matched as a WHOLE shape
 * .why = a box that holds only the placeholder is `clear`. the match is the full shape — `Try
 *   "<hint>"` on ONE line, no text after — never a bare `Try "` prefix, which a human's own longer
 *   message (`Try "query X first"…`) satisfies; that would read `clear` and a say would then paste
 *   over their work
 * .note = a whitelist of one measured shape, so it covers only this hint. the general case is
 *   closed by the dim read (`linesBright`), which needs no whitelist; this holds the floor where
 *   the dim attribute is lost in transit, and the two cannot disagree — both answer `clear`
 */
const INPUT_PLACEHOLDER_MARKERS: RegExp[] = [/^Try ["“][^"”\n]*["”]$/];

/**
 * .what = the hint the brain greys into the input box while its queue holds unreleased messages
 * .why = measured 2026-09-18, live claude v2.1.87, against a peer mid-turn on a 2000-line print:
 *
 *     ── rule ──
 *       ❯ A1-PROBE-SENTINEL-alpha            ← the queued message, above the band
 *     ── rule ──
 *     ❯ Press up to edit queued messages     ← THIS, dim, inside the box
 *     ── rule ──
 *
 *   ⇒ the capture is `.agent/.cache/repo=rhachet/skill=clone-say/debug.2026-09-18.log`. the same
 *   read taken against a FREE peer shows a bare `❯` on that row, so the hint is present exactly
 *   while the queue is non-empty
 *
 * .note = the hint is the ONLY discriminator on the screen. position cannot serve: a RELEASED
 *   turn renders `❯ <message>` above the band too (same glyph, same region — measured in the same
 *   capture), so `countOnScreen` rising says the message left the box and never says where it went
 * .note = matched as a PREFIX, never the full phrase — the plural is unmeasured at a queue depth
 *   of one, so a `queued message` singular variant must not read as an empty queue
 */
const INPUT_QUEUE_HINT_MARKERS: RegExp[] = [/\bPress up to edit queued\b/];

/**
 * .what = collapse every whitespace run — newlines included — to one space, and trim
 * .why = 🔴 a rendered screen breaks one logical message across rows by TWO mechanisms, and a
 *   match must be blind to both:
 *   - an interior `\n` — `asCloneDispatchFrame` lands each one in the box as a real row
 *   - a terminal SOFT-WRAP — a message wider than `cols` is broken by the renderer at a word
 *     boundary, and the continuation row carries its own indent
 *   the second was unhandled until 2026-09-20, and the prior docblock asserted it could not
 *   happen (*"a SINGLE-line needle holds no `\n`, so it can never span the inserted separator"*).
 *   measured against this very session: a 147-char self-say at `cols=98` rendered across two
 *   rows, so `indexOf` of the unbroken needle found naught, the count never rose, and a message
 *   that plainly landed reported `absent` — the R1 false failure, from the opposite direction
 * .note = whitespace is the right equivalence class precisely because the RENDERER is what
 *   inserted it. two messages that differ only in whitespace now collide, which is sound for a
 *   rise detector: the screen cannot part them either
 */
const asCollapsedWhitespace = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

/**
 * .what = count each occurrence of a needle across a set of lines, no overlap double-counted
 * .why = `countOnScreen` and `countInInput` are both counts of the caller's message; a caller
 *   compares a pre-write count to a post-bound count and reads the RISE, never the presence
 * .note = both sides are whitespace-collapsed first, so neither an interior newline nor a
 *   terminal soft-wrap can hide a needle that IS on the screen (see `asCollapsedWhitespace`).
 *   🔴 the stake is sharpest on `countInInput`: a wrapped message in the box that counts 0 makes
 *   `buffered` UNREACHABLE, and `buffered` is the one verdict that tells a caller their text sits
 *   in the box, where a re-send would append and wedge it
 */
const countNeedleInLines = (input: {
  lines: string[];
  needle: string;
}): number => {
  const needle = asCollapsedWhitespace(input.needle);
  if (needle.length === 0) return 0;
  const haystack = asCollapsedWhitespace(input.lines.join('\n'));
  // .note = deliberate mutation — a bounded tally, local to this count
  let total = 0;
  // advance a cursor past each match so overlaps never double-count
  let cursor = 0;
  for (;;) {
    const found = haystack.indexOf(needle, cursor);
    if (found === -1) break;
    total += 1;
    cursor = found + needle.length;
  }
  return total;
};

/**
 * .what = the input-box band — its two rule indices and the `❯`-led rows between the LAST pair
 * .why = `say` classifies a REGION, never a single row: `asCloneDispatchFrame` maps interior
 *   newlines into the box as real lines, so a multi-line message occupies several rows. a row-scoped read
 *   makes `buffered` unreachable and reintroduces the clobber on a human's multi-line entry. the
 *   `top` index lets the modal scan EXCLUDE the box band, so the box's own content is never read
 *   as a prompt (r7-i003-b1)
 * .note = returns null when no box band is present (a modal that replaced it, or an unrecognized
 *   screen). the measured structure (real haiku v2.1.87): the box is the single `❯` region
 *   between the last full-width `─` rule pair at the viewport foot; turns and any prompt render
 *   ABOVE the top rule
 * .note = `bottom` rides along so the modal FOOTER scan can read the rows BENEATH the band —
 *   the one region a human's typed text can never reach, since box content lives between the
 *   rules. that is what makes the footer a structural signal rather than a phrase whitelist
 * .note = EXPORTED so `computeCloneInputContent` reads the box off the same locator this
 *   classifier decides `dirty`/`clear` from. two locators would drift, and the drift is the
 *   hazardous direction: a `clone get --what buffer` that showed a different band than the
 *   one the pre-check refused on would have a human debug a box the daemon never read
 */
export const getInputBand = (input: {
  screen: CloneScreenLive;
}): {
  top: number;
  bottom: number;
  lines: string[];
  linesBright: string[];
} | null => {
  const lines = input.screen.lines;
  // .note = deliberate mutation — walk from the foot to find the last rule pair
  const ruleRows: number[] = [];
  for (let y = 0; y < lines.length; y++)
    if (isRuleRow(lines[y]!)) ruleRows.push(y);
  if (ruleRows.length < 2) return null;

  // the box sits between the LAST two rule rows near the viewport foot
  const bottom = ruleRows[ruleRows.length - 1]!;
  const top = ruleRows[ruleRows.length - 2]!;
  return {
    top,
    bottom,
    lines: lines.slice(top + 1, bottom),
    // the SAME row window over the bright-only screen — the rule rows are located on
    // `lines` (a rule is bright chrome either way), so both slices are index-aligned
    linesBright: input.screen.linesBright.slice(top + 1, bottom),
  };
};

/**
 * .what = the box content of a band, one row per line, with the `❯` prompt glyph stripped
 * .why = every read of the box — the count, and the dirty/clear decision — wants the CONTENT,
 *   never the chrome. a multi-line message renders as `❯ line1` / `  line2`, so a needle that
 *   carries a `\n` only matches once the glyph and per-row indent are gone and the rows rejoin
 * .note = EXPORTED for the same single-owner reason as `getInputBand` above — the content a
 *   `--what buffer` read shows a human must be the content the classifier graded
 */
export const asBandContentLines = (lines: string[]): string[] =>
  lines.map((line) => line.replace(/^\s*❯\s?/, '').trim());

/**
 * .what = classify a rendered screen into the clone's input state — pure, no i/o
 * .why = the read channel rests on this transform: the daemon emulates the pty stream into a
 *   grid (genCloneScreenFeed), then this classifies the grid the socket's `get` reports. built
 *   against the measured haiku screen, never a guessed one (rule.require.playtest-via-real-dogfood)
 * .note = focus is a whitelist checked MODAL-first, so a fourth focus value refuses by default,
 *   and `--force` can override a dirty region but never a modal (the pre-check reads focus first)
 */
export const computeCloneInputState = (input: {
  screen: CloneScreenLive;
  message: string;
}): CloneInputState => {
  // scan the live viewport (the last `rows` lines), never scrollback: a stale scrollback echo of a
  // short message ("ok", "yes") would read as a rise this dispatch never caused. the box band sits
  // at the viewport foot, so countOnScreen stays a superset of countInInput
  //
  // .residual = the frame SLIDES, so a needle present in the baseline viewport can scroll off the
  //   top by the post read. that LOWERS the post count, so the failure mode is a missed rise (an
  //   under-report toward `absent`, which the transcript verifies regardless) rather than a forged
  //   one. a fixed frame wants retained scrollback and its own render-latency measurement (r7-n1)
  const viewportStart = Math.max(
    0,
    input.screen.lines.length - input.screen.rows,
  );
  const viewportLines = input.screen.lines.slice(viewportStart);

  const countOnScreen = countNeedleInLines({
    lines: viewportLines,
    needle: input.message,
  });

  // locate the input box FIRST, so the modal scan can EXCLUDE the box band. a real prompt
  // draws its option menu ABOVE the box (the content region), so it is read there; the box's
  // OWN content must never satisfy a modal marker
  const band = getInputBand({ screen: input.screen });

  // a modal above the box refuses the write, and has no force path (V3) — so the scan is bounded
  // twice over. it shares the live-viewport window, since a signal that scrolled into history would
  // take a healthy clone deaf on unknowable screen state (r7-b1); and it excludes the box band,
  // since a human whose box holds `1. …` renders `❯ 1. …` inside it (r7-i003-b1). with no box
  // present a modal has replaced it, so the whole viewport is in scope
  const modalScanEnd = band ? band.top : input.screen.lines.length;
  const modalLines = input.screen.lines.slice(viewportStart, modalScanEnd);
  const isModalAbove = hasOptionRun(modalLines);

  // the second modal detector reads BELOW the band, where a human's typed text can never reach
  // (box content lives between the rules), so it survives the band exclusion above
  const footerLines = band
    ? input.screen.lines.slice(band.bottom + 1)
    : ([] as string[]);
  const isModalFooter = footerLines.some((line) =>
    MODAL_FOOTER_MARKERS.some((marker) => marker.test(line)),
  );

  // the two detectors cover opposite geometries: the footer catches a menu fenced by its own rule
  // pair (which the band slice would otherwise swallow), the option run catches one above the band
  if (isModalAbove || isModalFooter)
    return {
      focus: 'modal',
      input: 'clear',
      countInInput: 0,
      countOnScreen,
      // a modal replaced the box, so the queue hint (which renders INSIDE the box) is
      // unreadable. `false` is the safe report: it cannot forge an `enqueued` on a screen
      // whose write channel already refuses (the pre-check reads focus first)
      queued: false,
    };

  // the box's absence = a screen we do not recognize
  if (!band)
    return {
      focus: 'unrecognized',
      input: 'clear',
      countInInput: 0,
      countOnScreen,
      // same as the modal branch: no box, so no hint to read
      queued: false,
    };

  // countInInput scans the FULL rendering, never the bright-only one: a caller's own queued
  // message may render dim, and a count that lost it would misreport `absent` for a message
  // that landed — the R1 false-failure this wish exists to kill
  const countInInput = countNeedleInLines({
    lines: asBandContentLines(band.lines),
    needle: input.message,
  });

  const content = asBandContentLines(band.lines).join('\n').trim();

  // the dirty/clear decision reads the BRIGHT-only box. the brain dims what IT drew — the
  // `Try "…"` placeholder, and a next-turn hint predicted from its own last reply — and leaves
  // what the HUMAN typed at default intensity. so an all-dim box holds no human work whatever
  // text it renders (measured 2026-09-17, live claude v2.1.87: a peer whose box showed its own
  // suggested next turn refused every say with `input-region-dirty`, and a ghost never clears)
  const contentBright = asBandContentLines(band.linesBright).join('\n').trim();

  // the placeholder whitelist sits beside the dim read rather than behind it: the two cannot
  // disagree harmfully — both answer `clear` — and it holds the floor where the dim attribute is
  // lost in transit (rule.require.a-cue-is-not-a-claim)
  const isPlaceholder = INPUT_PLACEHOLDER_MARKERS.some((marker) =>
    marker.test(content),
  );
  const region: CloneInputRegion =
    content.length === 0 || contentBright.length === 0 || isPlaceholder
      ? 'clear'
      : 'dirty';

  // the queue hint is read DIM-ONLY — present in the full rendering, absent from the bright one.
  // the brain dims what IT drew, so that pair is what parts its own hint from a human who typed
  // the same words into the box. without the dim clause the marker is a bare phrase whitelist a
  // human could satisfy, and a forged `queued` would hold `--await release` to its bound on a
  // message the brain had already taken
  const isQueueHint =
    INPUT_QUEUE_HINT_MARKERS.some((marker) => marker.test(content)) &&
    !INPUT_QUEUE_HINT_MARKERS.some((marker) => marker.test(contentBright));

  return {
    focus: 'input',
    input: region,
    countInInput,
    countOnScreen,
    queued: isQueueHint,
  };
};
