# F04 — `@xterm/headless` as a prod dep, over a hand-rolled screen model

**rework** clean · **status** OPEN · **confidence** 90%

## .the fork, stated fairly

the daemon must turn a stream of pty bytes into a **rendered screen** — cursor moves, line wraps,
scroll regions, clears, SGR. that is a terminal emulator.

| option | cost |
|---|---|
| **A** — `@xterm/headless@6.0.0` | a new prod dependency in a package whose install surface already carries `node-pty` |
| **B** — hand-roll a minimal screen model | a terminal emulator, written by us, correct only for the escape sequences we happened to test. the classic NIH trap |
| **C** — regex the raw byte stream, no screen model | the redraws defeat it. a TUI rewrites the same row many times, so "is our text in the input line" is unanswerable from bytes |

## .taken, and why at the time

**A.** the package exists, is the xterm.js project's own headless build, and its stated purpose is
exactly this — hold a terminal's state for a process, off a pty byte stream. and it is **dual-module**
(`main: lib-headless/xterm-headless.js` CJS, `module: lib/xterm.mjs`), so
`rule.forbid.eager-esm-imports-in-prod` is satisfiable with the CJS entry.

the read we need is the cheap one: `Terminal.buffer.active.getLine(i).translateToString()` returns a
rendered row as plain text, so **no serialize addon is owed** — we want rows, not a framebuffer replay.

B fails the same test `rule.always.reuse-pavement-before-improvise` asks: pavement exists, and a
hand-rolled emulator is a second path beside a maintained one.

## .rework, and why

**clean.** the screen model sits behind one injected operation (`readScreen`), so a swap changes one
module and no caller. the dependency is the only externally visible part, and a removal is a
`pnpm remove` plus that one module.

## .confidence 90%, and why not higher

the 10% is the install surface. this repo already fought a `node-pty` build-step defect
(`a810d4d fix(pty): bump node-pty so a linux enroll needs no manual build step`), so it has paid for
a native-dep install hazard before. `@xterm/headless` is pure JS with no native build, which is why
the residual is small rather than absent. its install footprint on a cold consumer is unverified —
only its manifest is (⇒ **Q18**). 🟡 **and the same entry owes a second unenumerated read**: `.cons`'s scrollback question is
**Q14**, settled by the same `.d.ts` this entry already owes once the dep installs.

## 🔴 .this entry has NO SUBJECT under F05 = B — read the lever first

the fork is *how the screen is modelled*. under F05 = B (the progress-extended transcript wait) there
is no screen to model, so the dep is never added and its three options are moot.

⇒ 🟡 **and that makes F04 the one entry whose 90% is misread if taken alone.** the confidence grades
*how sure I am of the option within the fork*, never *how likely the fork is to survive* — and this
fork sits entirely downstream of **F05**, one of this list's least-sure calls. ⇒ **a wisher who reads
this page in isolation reads 90% as the odds the dep ships; it is not.**

🟡 the claim that carries the argument needs no figure: F04 is downstream of F05, whatever either
number reads. ⇒ `rule.require.a-cue-is-not-a-claim` — read the figures off the summary table, which
owns them.

⚠️ the section below says a verdict here changes no demo — true, and a verdict on **F05** deletes this
page outright. the two facts are unrelated and the second is the larger one.

## .where

- `package.json` — `node-pty 1.2.0-beta.15`, no xterm-family package today
- `…case=F05….md` — the lever that deletes this entry's subject
- 🔴 the feed's **outcome** — no probe against a screen that is not live (`1.vision.yield.md`,
  `.where the screen comes from`). `genBrainCliPtyClone.ts:168` is the extant tee, which **proves the
  stream is reachable and is NOT the attach point** — it sits after the bind gate at `:162`
- 🔴 the emulator's own **geometry** (`1.vision.yield.md`, `.the geometry`) — `genBrainCliPtyClone.ts:116`
  spawns the child at the terminal size of the human who **enrolls** it, and `:174-177` re-flows it on
  that human's window drag, so `cols`/`rows` are host-dependent AND mutable mid-run. the terminal must
  be constructed at that geometry and track it (⇒ **V14**). 🟡 this entry's own opening line names
  *"line wraps"* as a reason the dep is owed, and a wrap is computed **against `cols`**
- `rule.forbid.eager-esm-imports-in-prod` — the constraint the CJS entry satisfies

### .the demos that RENDER this call — NONE, and that is a fact rather than a gap

not one `case=N` names a screen model, a library, or a render mechanism. the demos render the
**classification** a probe returns; how those four fields are computed sits behind `readScreen`.

⇒ **so F04 is demo-invisible, and a verdict on it changes no demo and no criterion.** that is the
`.rework = clean` claim, stated as an observation rather than a prediction — and it is why F04's
confidence sits **above** the levers' rather than beside them. the **relation** is what the sentence
needs; the numbers live in the summary table.

🟡 recorded explicitly because an **absent** row and an **unchecked** one render identically. to
leave this section off would make a walked absence indistinguishable from a walk never made
(`rule.forbid.failhide` — the same absence-of-evidence trap the glossary litigated for `absent`).

## .the verdict

unruled.
