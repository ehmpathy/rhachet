# F10 — converge the two keyrack prefix-strippers now, or defer for scope?

- **raised** = i049, from r011 (`enroll-impl-arch-defects`, nitpick 1)
- **rework** = **clean** — measured, see below
- **confidence** = 76%
- **status** = ⏳ open — deferred, on SCOPE alone

## .the fork, stated fairly

a peer lane raised that this repo has several independent readers of *"a `HelpfulError`'s bare
sentence"*. a check confirmed it and found it worse than reported: **two** hand-rolled prefix
strippers in keyrack (`getKeyrackBlockedReport`, `asKeyrackErroredKeyTip`), whose own docblocks
disagree with each other about the right technique, plus a third site
(`asCliErrorJson.getUndecoratedMessage`) that needs no strip at all because it reads the field
`helpful-errors` stashes for exactly this.

**take it now** — the duplication is real, measured, and self-contradictory on the page. a reviewer
asked for it. the repair removes a fragile regex.

**defer it** — keyrack is not this wish's subject, and `rule.forbid.scope-leaks` is a lane that
grades this branch.

## .taken, and why — at the time

deferred. caught as `.dream/2026_09_03.one-owner-for-the-bare-helpful-error-sentence.dream.md`,
symlinked at `$route/dreams/`.

**the reason is SCOPE, and scope only.** r005's own `.taken` recorded the test this drive applies to
a scope question: *"is the item downstream of an acceptance criterion, or beside it?"* the three
surfaces this round touched beyond the two-line cure each answered *downstream*. keyrack's error
render answers **beside** — no acceptance criterion of this wish reaches it, and no defect this wish
diagnosed runs through it.

## 🚨 .the rework grade is CLEAN, and it was nearly graded DIRTY from an impression

the first draft of this row read `dirty`, on the assumption that a convergence would move keyrack's
snapshots. **that assumption was never measured, and it is false.**

measured from `node_modules/helpful-errors/dist/HelpfulError.js`:

- the constructor stores `original = { message, … }` — the **raw** message, before any prefix, before
  any serialized-metadata tail
- it renders `.message` as `prefix + message` (+ tail), where `prefix` is `${emoji} ${ClassName}: `
- `redact([...])` rebuilds through that same constructor, so it re-applies the prefix

⇒ `redact(['metadata','cause']).message` **minus its prefix** is exactly `original.message`. so a
convergence of the two keyrack sites onto the structural read is **render-neutral by construction** —
no snapshot moves, no frame changes, no caller hardens against it.

⚠️ **that inverts the weight of this deferral, and the inversion is the point of the row.** F7 records
what a wrong grade costs: it was deferred four rounds on a *"19 files"* guess that turned out to be
one test helper, and **`dirty` was the grade that made the deferral defensible.** the same shape was
one sentence away from repetition here — an unmeasured `dirty` would have made a scope-only deferral
look like a cost-driven one, which is a stronger justification than the facts support.

⇒ so the row is filed **clean**, and the deferral rests on the one argument that actually holds. a
council that reads this row should read it as *"cheap, and out of scope"* — never as *"expensive"*.

## .the bound on the measurement

reasoned from the library's source, **not executed**. the dream's step 5 names the clamp that would
settle it empirically: a `HelpfulError` whose message legitimately contains a `WidgetError: ` token
mid-sentence — the input that parts the structural read from both regexes, and the one input on which
they could disagree.

⇒ stated because *"measured"* and *"read the source"* are different claims, and F7's lesson is about
exactly that gap.

## .where

- `src/contract/cli/asCliErrorJson.ts` — the owner-to-be (`getUndecoratedMessage`, private today)
- `src/domain.operations/keyrack/getKeyrackBlockedReport.ts` — duplicate 1 (regex)
- `src/domain.operations/keyrack/cli/asKeyrackErroredKeyTip.ts` — duplicate 2 (constructor.name)
- `src/domain.operations/upgrade/execUpgrade.ts` — **not** a duplicate; reads the decorated form on
  purpose, defended by its own test

## .the verdict, once ruled

⏳ open. the wisher may overrule the scope call at any time — the repair is cheap and the row is
graded so that the choice is made on the true cost.
