# fulcrum F11 — modal detection is structural (Q8-grounded), over the 4-marker phrase whitelist

**arose:** 5.1.execution.from_vision, r007 (arch-hazards-behavior) blocker.2
**rework:** dirty · **status:** OPEN · **confidence:** 50%

## the fork, stated fairly

`computeCloneInputState.ts:53-58` tells a modal from the input box by four regexes
(`/❯\s*\d+\.\s/`, `/❯\s*(Yes,|No,)/`, `/\bDo you want to\b/i`, `/\bto confirm\b/i`). the "never
answer a permission prompt" guarantee (V3/case=6) rests on that phrase set: a prompt phrased outside
the four, on a screen that still renders a box band, reads `focus: 'input'`, the pre-check proceeds,
and the daemon's `\r` answers a tool call no human approved — the unbounded-cost hazard.

- **option A (shipped):** the 4-marker phrase whitelist.
- **option B (the reviewer's):** a STRUCTURAL check that refuses a screen NOT provably a recognized
  clean input box (defensive default), rather than a list of guessed phrases.

## what was taken, and why

**deferred to the Q8 measurement — not best-guessed.** option B is the right target, but the
reviewer's own cited premise defeats every Q8-free structural default. the vision note says *"the
input-box band is ALWAYS present at the viewport foot, even when a prompt overlay holds focus"* — so
"box band present" cannot tell input from modal, and the signal that parts them is the overlay ABOVE
the band, whose structural signature is exactly **Q8** (*"is a modal distinguishable?"* — unrun).

| candidate Q8-free structural default | failure |
|---|---|
| refuse unless *provably* a clean box | scrollback always renders content above the band → refuse-always → a permanently deaf clone |
| treat any `❯` above the band as a menu | scrollback holds old `❯` prompts → false-modal → deaf clone |
| the current 4-marker whitelist | a prompt outside the 4 phrasings → false-input → the safety hole |

two of the three are strictly worse (a deaf clone regresses the primary ask). without Q8 to
characterize a REAL prompt grid vs a REAL clean-box grid, any replacement is a guess no better
grounded than the markers.

## rework, and why dirty

the replacement is not a local edit: it needs a structural model of the real screen (Q8 output), and
it changes the safety-critical classify path that case=6 and the pre-check both rest on — a change
whose wrongness ships either a deaf clone (regression) or an answered prompt (the exact hazard).

## confidence, and why low (50%)

the lowest on the board: the DIRECTION (structural > phrase-match) is sound, but whether a
correct structural default even EXISTS is unknown until Q8, and F07 (is case=6 in scope at all?)
remains the wisher's open call — so the fulcrum may be mooted rather than resolved.

## the Q8 partial measurement (real haiku, 2026-09-15)

`blackbox/cli/clone.modalprobe.realbrain.acceptance.test.ts` measures the **deaf-clone half** of the
fork against a real claude: dispatch a prompt whose reply IS a numbered list (`1. apple` …), land it,
then dispatch a second benign say into the now-idle box and read the shipped verdict.

**result: verdict `released`, exit 0, reason null — the over-match does NOT fire.** a real haiku renders
a plain numbered list as bare `1. apple` with no `❯` cursor glyph, so `MODAL_MARKERS[0]` (`/❯\s*\d+\.\s/`)
does not match list content; the `❯` is reserved for an interactive option menu. together with the
live-viewport-window scope, a numbered-list reply does not deaf the clone.

⇒ this grounds ONE of the two coupled hazards: the "deaf clone" over-match (the reviewer's r007 b1
severity — "ships deaf on the normal path") is measured as absent for the demonstrated normal case.
the **safety-hole half** — a real permission prompt phrased outside the 4 markers, which needs a
captured real prompt grid — stays un-measured, and the structural fix stays a dedicated-PR dream
regardless (`.dream/2026_09_14.modal-detection-structural-over-marker-whitelist.dream.md`). the
`modalprobe` clamp goes red if a future change makes the over-match reappear.

## where

`computeCloneInputState.ts:53-58` (`MODAL_MARKERS`), `:131-135` (the modal branch) · gated on Q8 and
coupled to F07 (case=6 scope) and Q17 (prompt frequency → case=6 care).

## the verdict, once ruled

_(unruled — awaits the Q8 realbrain permission-prompt capture and the F07 scope call)_
