# domain.term.choice.reason: frame

## .etymology

**`frame` is taken from the sense a photograph or a film has: one bounded view, composed, that a
person looks at as a unit.** the fit is precise on three counts:

1. **it is bounded.** the blank lines above and below are part of it — a frame has edges, and those
   edges are what separate one cli event's lines from the next's
2. **it is composed, never captured.** a frame is assembled from parts chosen for a viewer; it is
   not a dump of whatever sat in the object
3. **it is what a viewer SEES**, as distinct from the subject it depicts. that third property is the
   whole reason the word was needed

⇒ the third carries the load. the repo already had good words for the *subject* — `blocked`,
`notice`, the error object and its fields — and no word at all for **what lands on the screen**.

## 🚨 .the evidence — the term was coined because its absence cost a real defect

`term=cli.frame`'s boundary section states the rule; this records the incident that produced it.

**2026-09-02, `v2026_08_25.fix-node-pty-install`, `asCloneSocketOmissionReasonError`.** the pty-absent
report's hint read *"compare the `rhachetRealpath` above against your package manager global root."*
its unit clamp asserted those exact words against the error object, and a comment in that clamp
called `.message` *"the only projection a human actually reads."*

**it is not.** the cli renders through `asCliErrorJson`, whose `getUndecoratedMessage` strips the
metadata tail and whose shape carries no `rhachetRealpath` key at all. so through the real binary the
datum reached **neither** the `✋` render **nor** the `--output json` payload — the hint sent a reader
to compare a line that is never printed.

> a confident cure that repairs naught — **the exact defect that wish exists to retire, reproduced
> inside the report written to retire it.**

every unit test was green, because a unit test reads the error OBJECT and the defect lived in its
RENDER. with one word for both, the clamp's own comment could assert the two were identical and no
reader had a word to disagree with.

⇒ so the coinage is not tidiness. **`frame` is what makes the render-gap table's two columns —
*content verified by* and *screen verified by* — expressible at all.**

## .the second incident, which settles the boundary from the other side

**2026-09-03, same branch.** `asCliErrorFrame` was extracted because three renderers had drifted, and
two defects had shipped on the *same line* of one of them: a bare `.message` printed the whole
metadata blob, and the redact that fixed it deleted every hint that lived only in `metadata.hint`.

the extraction's shape is decided by this term: **a transformer that returns LINES, never a printer
that writes them.** because a frame is an artifact rather than an act, it can be returned, asserted
row by row, and clamped with no captured stream — which is what let the pair of opposite defects be
held as a pair.

⇒ had the concept been named `render` (a verb-shaped noun), the natural shape would have been a
function that *writes*, and its clamp would have needed a captured stream — the harder, flakier test
that likely would not have been written.

## .the rejected words, and why each was rejected

| word | why not |
|---|---|
| **`output`** | already three senses in this repo: a stream, a metadata key that holds a captured log, and a `--output json` flag. a fourth is the overload `rule.forbid.domain-term-ambiguity` forbids |
| **`render`** | verb-shaped. as a noun it names the act; we needed the artifact. and it would have shaped the code toward a printer rather than a transformer — see above |
| **`display`** | reads as the device or the act of show, not the composed lines |
| **`banner`** | a real and *different* concept here — the mascot/artifact header a skill prints. to reuse it would collide |
| **`block`** | collides with `blocked` (the refusal report) one letter away, on the very surface where the two would sit together |
| **`message`** | already owned by `Error.message`, and that field is *precisely* what a frame is not |

## .disputes

none open.

⚠️ **the first a later reader may raise, pre-empted:** *"is `frame` not just `notice` for the failure
case?"* no — they sit on different axes. `notice` is an **occasion** (a successful command left a
render behind); `frame` is a **shape** (the lines any occasion renders as). a `notice` HAS a frame;
so does a `blocked` report. see the near-neighbors table in the say file.

### 🚨 the second, pre-empted with its enumeration already done: **`screen`**

*"a frame is ONE event's lines. what names ALL of one invocation's frames, in order?"*

**the concept is real and it is unnamed.** `init`'s stdout is many frames — a `🔧` opener, a `📚`
per linked role, a `💪` per init, a `✨` closer — and a blank line lost BETWEEN two of them is
invisible to every frame-level assertion. that is a third rung on the proof ladder this cluster
already carries two rungs of:

| rung | what it is | proven by |
|---|---|---|
| **report** | the error object and its fields | a payload snapshot |
| **frame** | the lines of ONE event | a run through the real binary |
| *(unnamed)* | **every frame of ONE invocation, in order** | a whole-stdout snapshot |

🔴 **but the word `screen` is unavailable, and the enumeration is why.** a grep for `WHOLE SCREEN`
returns only the sites that agree — a pattern shaped by its expected answer. the plain grep for
`screen` returns four live senses:

| sense | site |
|---|---|
| the **device** — *"reach a screen"*, *"put a raw stack on screen"* | `asCloneSocketBindFaultError.ts`, `getLibcFromProcess.ts` |
| 🔴 a **captured pty mirror of ANOTHER program** — a declared field | `enrollCloneHarness.ts` — `getScreen?.()`, `--- brain screen ---` |
| an **ansi screen-clear CSI** — `\x1b[2J` | `isSafeCloneDispatchInput.ts` |
| all of one invocation's stdout | `asAbsoluteInitScreen`, and this file's own prose |

⇒ the second row settles it. `getScreen` is a **live declared contract** whose sense is *the
brain's own terminal buffer* — a different subject entirely. and the first row is the objection
that already killed `display` above (*"reads as the device"*). **so `screen` would be the overload
`rule.forbid.domain-term-ambiguity` forbids, on a term coined to retire an overload.**

**the verdict: WATCHED, never coined.** per `rule.require.enumerate-before-you-name`'s own bound,
a concept with one instance says so — and the instance is a single test-local transformer
(`asAbsoluteInitScreen`, 2026-09-07). when a second arrives, the coinage is owed, and the candidate
set must start below `screen`: `reel` and `strip` both extend this term's own film etymology and
were unclaimed at that date.

⚠️ **the lesson is the instrument, not the word.** the narrowed grep confirmed the answer it was
shaped by. that is the same failure the mask incident produced hours earlier the same day
(`term=snapshot.mask._.choice.reason.md`) — a pattern authored against a remembered render, green
either way.

## .the boundary qualifier

`term.boundary = cli`. the test — *"$word, of WHAT?"* — answers in one word: a frame **of cli
output**. the concept is bounded to the terminal surface; no api, sdk, or persisted artifact uses it.

⚠️ its nearest peer `term=glyph` carries **no** boundary field, since it predates
`rule.require.boundary-qualified-terms`. it is left in place until disturbed rather than swept — a
bulk rename is forbidden by that rule's own enforcement, and a partial sweep is worse than a
consistent extant set.
