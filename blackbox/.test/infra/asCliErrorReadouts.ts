import { ConstraintError } from 'helpful-errors';

/**
 * .what = the reads a pty-driven acceptance case takes off a rhachet render — the human
 *   FRAME off the tty stream, the machine PAYLOAD off the `--output json` channel, and the
 *   reach BREADCRUMB a bare enroll leaves behind
 *
 * ⚠️ every throw below is a `ConstraintError` with a `hint`. the party at fault is always
 *   the CALLER — a producer was reworded, or a case drove a command that emitted no
 *   payload (`rule.require.failloud`, `rule.forbid.helpful-error-parents`).
 */

/**
 * .what = the rhachet-authored error frame, pulled out of a raw pty stream — the
 *   `<glyph> <Class>: <message>` line PLUS the metadata block beneath it
 *
 * .why = no payload snapshot can pin this. a correct error object rendered through a wrong
 *   glyph, a swallowed hint, or a truncated line is still a defect
 *   (`rule.forbid.snapshot-visual-blemishes`).
 *
 * 🚨 .why it no longer FILTERS lines by token = it used to keep any line that held `💥`, `✋`,
 *   or `└─`, on the premise that *"the frame is the glyph line plus its `└─` fix line."*
 *   **`asCliErrorFrame` stopped to emit `└─`** — it renders a json metadata block instead —
 *   and a json line holds none of the three tokens. so the filter silently returned the
 *   GLYPH LINE ALONE, and four `[case4]`–`[case7]` "visual spot-check" snapshots in
 *   `enroll.reach.acceptance.test.ts` were pinned as single-line strings that assert naught
 *   about the hint, on the exact surface that proves this wish's class split.
 *
 *   ⚠️ every layer READ as correct: the call site's comment says *"plus its metadata block"*,
 *   this docblock said *"plus its `└─` fix line"*, and the snapshot showed a clean, complete
 *   sentence. only the produced VALUE disagreed, and no row looked at it.
 *
 * ⚠️ .why a SPAN rather than a filter = a filter asks *"does this line carry a token I know?"*,
 *   which drifts the moment the render's tokens change. a span asks *"where does the frame
 *   start and end?"* — a question about STRUCTURE, which the render cannot silently
 *   invalidate: a shape change breaks the anchor LOUDLY rather than quietly narrows the result.
 */
export const asCliErrorFrameFromOutput = (input: {
  output: string;
}): string => {
  // \r survives a pty stream, so every line is compared trimmed of its tail
  const lines = input.output.split('\n').map((line) => line.trimEnd());

  // ⚠️ anchored on the frame's SHAPE — `<glyph> <Class>: ` at line start — never on a bare
  //   glyph. a pty stream carries rhachet's own chrome, and `└─ ✋ blocked by constraints`
  //   holds a `✋` yet is no frame at all. the `^` and the `Error: ` are what part the two,
  //   and they are the contract `asCliErrorFrame` actually renders
  const indexGlyph = lines.findIndex((line) =>
    /^(?:💥|✋) \w+Error: /.test(line),
  );
  if (indexGlyph < 0)
    throw new ConstraintError('no rhachet error frame in output', {
      hint: 'the command may have exited 0, so drive one that fails — or `asCliErrorFrame` no longer renders `<glyph> <Class>: <message>`, in which case this scan owes the repair, never the case',
      output: input.output.slice(0, 400),
    });

  // the metadata block is optional: `asCliErrorFrame` omits it entirely when the error
  // carries none, so an absent block is a valid frame rather than a miss
  const indexOpen = lines.findIndex(
    (line, index) => index > indexGlyph && line.trim() !== '',
  );
  if (indexOpen < 0 || lines[indexOpen]!.trim() !== '{')
    return lines[indexGlyph]!;

  // the closer is the next own-line `}` at the SAME INDENT as the opener — the identical
  // discipline `asCliErrorJsonFromOutput` records below, and for the identical reason: a
  // nested object's closer is also an own-line `}`, so an any-indent match truncates the span
  const indentOpen =
    lines[indexOpen]!.length - lines[indexOpen]!.trimStart().length;
  const indexClose = lines.findIndex(
    (line, index) =>
      index > indexOpen &&
      line.trim() === '}' &&
      line.length - line.trimStart().length === indentOpen,
  );
  if (indexClose < 0)
    throw new ConstraintError('an error frame metadata block never closed', {
      hint: 'the block may have gained a nested field this scan cannot span — widen the scan rather than flatten the frame',
      output: input.output.slice(0, 400),
    });

  return [
    lines[indexGlyph]!,
    '',
    ...lines.slice(indexOpen, indexClose + 1),
  ].join('\n');
};

/**
 * .what = the RAW trace line `genCloneSocketServer`'s `ready.catch` writes to stderr, pulled
 *   out of a pty stream — the unframed diagnostic a human reads ABOVE the rendered frame
 *
 * 🚨 .why it needs a readout of its own = `asCliErrorFrameFromOutput` spans from the glyph
 *   line down, so every line the enroll printed BEFORE the frame is dropped. that made this
 *   line invisible to every acceptance snapshot — a human sees it on a bind fault and no
 *   reviewer could. the frame readout is right to be a span; the cure is a second readout,
 *   never a widened first (raised by the r009 `behavior-friction-hazards` lane at i076).
 *
 * ⚠️ this readout takes NO position on whether the line should exist. it exists so the
 *   screen is legible in review — the trade that puts it there is litigated in
 *   `genCloneSocketServer`'s own `ready.catch` note, and it is a real cost stated as one.
 *
 * ⚠️ throws when absent, never returns null. a null would let a row pass empty on the very
 *   fault it was written to render (`rule.forbid.failhide`).
 */
export const asCloneSocketTraceFromOutput = (input: {
  output: string;
}): string => {
  const lines = input.output.split('\n').map((line) => line.trimEnd());

  // anchored on the emit's own opening words, which are the stable half of the line —
  // its tail carries an errno and a socket path that vary by host and by run
  const trace = lines.find((line) =>
    line.includes('clone socket ready rejected with'),
  );
  if (!trace)
    throw new ConstraintError('no clone socket trace line in output', {
      hint: "the case may not have driven a `ready` rejection — only a bind fault, a chmod fault, or the bind bound reaches it. or `genCloneSocketServer`'s `ready.catch` was reworded or removed, in which case that change owes this readout's repair",
      output: input.output.slice(0, 400),
    });

  return trace;
};

/**
 * .what = the `asCloneReachBreadcrumb` treestruct, pulled out of a raw pty stream — its
 *   `😶 clone enrolled` root and both reach branches, rejoined in emit order
 *
 * ⚠️ the rows are located INDEPENDENTLY rather than as an adjacent run. a pty is one
 *   stream shared with the brain subprocess, so a line of its boot noise can land between
 *   two of our own consecutive writes. an adjacency read would then miss a branch and
 *   snap a truncated crumb as though the emit had changed.
 *
 * ⚠️ returns `''` rather than throws when NO row is present — absence is itself an
 *   asserted contract: a refused enroll throws before the breadcrumb, so its rows are owed
 *   to be absent. SOME rows without the rest is a TORN crumb rather than an absence, and it
 *   throws — a half block returned quietly would snap as a plain snapshot update
 *   (`rule.forbid.failhide`).
 *
 * ⚠️ .why the branches are found by their COMMAND rather than by their glyph = the glyph is
 *   decoration and the command is the capability. a scan keyed on `🎙️` would redden here
 *   on a purely visual change, while a scan keyed on `rhx clone say` reddens only when the
 *   reach itself moved — which is the event this readout exists to catch.
 */
export const asCloneReachBreadcrumbFromOutput = (input: {
  output: string;
}): string => {
  const lines = input.output.split('\n').map((line) => line.trimEnd());
  const marks = ['😶 clone enrolled', 'rhx clone say @:', 'rhx clone get @:'];
  const found = marks.map((mark) => ({
    mark,
    line: lines.find((line) => line.includes(mark)) ?? null,
  }));

  // no row emitted at all — the asserted absence
  if (found.every((row) => row.line === null)) return '';

  // some rows without the rest — a torn crumb, never an absence
  const absent = found.filter((row) => row.line === null).map((row) => row.mark);
  if (absent.length)
    throw new ConstraintError('a clone reach breadcrumb emitted only some rows', {
      hint: 'the emit writes a root and two branches; a subset means the treestruct was split or half-swallowed',
      absent,
      found: found.filter((row) => row.line !== null).map((row) => row.line),
      output: input.output.slice(0, 400),
    });

  return found.map((row) => row.line!).join('\n');
};

/**
 * .what = the `CliErrorJson` payload, pulled out of a raw `--output json` pty stream
 * .why = the stream also carries fixture and brain-boot noise, so the payload is located
 *   by the shape `withCliOutputErrors` renders — `JSON.stringify(shape, null, 2)`
 *
 * ⚠️ anchor on the own-line `{` ADJACENT to `"class"`, never a bare `{` — noise holds
 *   braces, and a bare anchor re-reads a different span per whatever precedes it.
 * ⚠️ throws rather than returns null; a null would let a row pass empty
 *   (`rule.forbid.failhide`).
 */
export const asCliErrorJsonFromOutput = (input: {
  output: string;
}): { class: string; message: string; hint: string | null } => {
  // \r survives a pty stream, so every line is compared trimmed of its tail
  const lines = input.output.split('\n').map((line) => line.trimEnd());

  // the opener is an own-line `{` IMMEDIATELY followed by the `"class"` key. noise may
  // hold either token alone; to demand them adjacent is what noise cannot fake
  const indexOpen = lines.findIndex(
    (line, index) =>
      line.trim() === '{' && /^\s+"class":/.test(lines[index + 1] ?? ''),
  );
  if (indexOpen < 0)
    throw new ConstraintError('no CliErrorJson payload in output', {
      hint: 'the command may have exited 0, so drive one that fails — or `withCliOutputErrors` no longer renders `JSON.stringify(shape, null, 2)`, in which case this scan owes the repair, never the case',
      output: input.output.slice(0, 400),
    });

  // the closer is the next own-line `}` at the SAME INDENT as the opener.
  //
  // ⚠️ it once matched the next own-line `}` at ANY indent, on the premise that the shape is
  //   flat so no nested brace could precede it. that premise died the day `CliErrorJson` gained
  //   `metadata` — a nested object whose own closer is an own-line `}`, indented two — so the
  //   scan bounded the span at the NESTED closer and handed `JSON.parse` a truncated object.
  //   an indent match spans a nest of any depth, which is what the absence branch below already
  //   told a reader to do (*"widen the scan rather than flatten the payload"*)
  const indentOpen = lines[indexOpen]!.length - lines[indexOpen]!.trimStart().length;
  const indexClose = lines.findIndex(
    (line, index) =>
      index > indexOpen &&
      line.trim() === '}' &&
      line.length - line.trimStart().length === indentOpen,
  );
  if (indexClose < 0)
    throw new ConstraintError('CliErrorJson payload opened but never closed', {
      hint: 'the shape may have gained a nested field, which this flat own-line scan cannot span — widen the scan rather than flatten the payload',
      output: input.output.slice(0, 400),
    });

  // ⚠️ the parse is wrapped so a malformed span names ITSELF as the cause. an uncaught
  //   SyntaxError here reads as a defect in the payload; the two absence rows above read
  //   as "no payload" — and neither is true of a span this scan located and mis-bounded.
  //   a report that names the wrong one of the three sends a reader to the wrong file
  //
  // ✅ `ConstraintError.wrap` rather than a hand-rolled try/catch: its sync branch attaches the
  //   caught `SyntaxError` as a real `cause`, where the hand-rolled form could carry only a
  //   stringified copy of it under a `parseError` key — `HelpfulError` types `cause` as `Error`,
  //   so a string could never sit there (`rule.prefer.helpful-error-wrap`)
  const span = lines.slice(indexOpen, indexClose + 1).join('\n');
  return ConstraintError.wrap(
    () =>
      JSON.parse(span) as {
        class: string;
        message: string;
        hint: string | null;
      },
    {
      message: 'a CliErrorJson span was located but did not parse',
      metadata: {
        hint: 'this scan mis-bounded the span, so repair the scan rather than the payload — the producer emitted valid json, or the open anchor would not have matched',
        span: span.slice(0, 400),
      },
    },
  )();
};
