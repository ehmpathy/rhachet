# F37 — the mode triple's surface lands, over a second deferral of it

**rework** clean · **status** OPEN · **confidence** 94% — one flag, one transformer, one strip-list row; a reversal is three deletions

## 🔴 .this row is an ACCOUNT, never a best-guess

every other row here records a fork I took while the wisher was away. this one records a fork I took
**that was never mine to take**, and the wisher's words are what re-opened it:

> *"so was --async"* · *"where the hell did we allow you to defer scope"* · *"fix this"*

⇒ `rule.always.defer-fulcrums-to-last` grants a drive the right to best-guess a fork and drive on. it
grants no right to **drop a named requirement** and report the round closed. the difference is not
subtle: a best-guess leaves a reversible call on the record; a silent deferral leaves the requirement
absent from the record entirely, so nobody can reverse what nobody can see.

## .the fork, stated fairly

the mode axis was settled as **vocabulary** — `watch` / `async` / `await`, each with a `.what`, a
derivation, a term cluster, and an invariant list. two of the three reached the cli as flags. `await`
reached it not at all.

⇒ the fork: **is a DERIVED axis owed a SURFACE for each of its values, or does the derivation
discharge the ask?**

## .what I first answered, and why it read as reasonable

**the derivation discharges it.** the argument was on the record and is not silly:

- the axis is settled by NATURE, never by preference — you cannot mirror into a terminal that does
  not exist, and you cannot detach from an answer you owe
- so a caller's ask can only NARROW what nature permits
- ⇒ and `-p` already narrowed it correctly, with a measured cure to prove it (three l3 lanes, green)

⇒ so the surface looked like ceremony over a derivation that already worked.

## .why that answer was wrong

🔴 **it is true of the DERIVATION and silent about the SURFACE**, and I read the silence as a no.

| the question | the honest answer |
|---|---|
| does `-p` derive the right mode? | yes, measured |
| can a caller who wants that mode NAME it? | no — they had to know a brain-cli flag implies a rhachet mode |

⇒ a settled vocabulary with one value absent from its own surface **teaches the surface rather than
the vocabulary**. a caller reads `--watch` and `--async`, infers a two-value axis, and the third value
is unreachable except by an inference nobody wrote down.

⚠️ and the cost compounds past ergonomics: with no `--await` token, the mode-flag read was a **ternary
chain**, so `--watch --async` returned `watch`, discarded the second flag, and exited 0. that is
`define.invariant.an-unknown-flag-is-refused-never-dropped` one grain in — a RECOGNIZED flag
discarded, which costs a caller what a drop costs and is equally invisible. **the absent surface hid
a live silent-drop defect.**

## .taken, and why

**land it.** all three values are statable, and each askable value carries a **nature clamp**, so the
surface cannot state an impossibility:

| flag | nature requires | else |
|---|---|---|
| `--watch` | a terminal to mirror into | refused by name |
| `--await` | a prompt, so the wait is BOUNDED | refused by name |
| `--async` | neither — it detaches from both | never refused on nature |

plus `asCloneEnrollModeAsked`, which owns the seam's one rule: **two stated modes are refused BY
NAME, never resolved by precedence.**

⇒ the `--await` clamp is the one that had no peer: an `await` holds until the child exits, and a
brain-cli session does not exit, so an `--await` with no prompt is an **unbounded** hang the caller
would read as a slow enroll rather than their own input defect.

## .the counter-argument, stated fairly

**a nature-derived axis genuinely needs fewer flags than it has values**, and three flags where one
inference would serve is surface a maintainer must keep in step with the derivation — two lists, one
contract, no compiler tie (the exact shape `getBrainCliPassthroughArgs` warns about).

⇒ the counter is real and it is answered by mechanism rather than by argument: the tie clamp at
`getBrainCliPassthroughArgs.integration.test.ts` reads every registered option out of `invokeEnroll.ts`
and asserts each is stripped. **it caught this drive's own leak** — `--await` absent from
`BOOLEAN_FLAGS` — at 3s, before any acceptance run spent a minute on it.

## .rework, and why

**clean.** one `.option(...)`, one transformer file, one `BOOLEAN_FLAGS` row, one widened union. no
caller of the derivation changes shape, no shipped payload gains a field, no snapshot but `enroll
--help` moves. to reverse it is three deletions and a resnap.

## .confidence 94%

the 6% is the chance the wisher wants the clash **resolved by a declared precedence** rather than
refused — a defensible ergonomics position (`--watch --async` could mean *"watch, and I typed async by
mistake"*). the counter is that a precedence is undetectable from the output: the enroll succeeds, the
clone stands up, the exit is 0, and the caller reads a well-formed result produced by a mode they did
not ask for.

## .where

- `src/domain.operations/clone/pty/asCloneEnrollModeAsked.ts` — the seam, and the by-name refusal
- `src/domain.operations/clone/pty/computeCloneEnrollMode.ts` — the widened `asked`, and the await clamp
- `src/contract/cli/invokeEnroll.ts` — the `--await` option and its wire-through
- `src/domain.operations/enroll/getBrainCliPassthroughArgs.ts` — the strip row the tie clamp demanded
- `blackbox/cli/enroll.acceptance.test.ts` — `[t2]` the stated `--await`, `[t3]` the clash refusal
- `.agent/repo=.this/role=any/briefs/domain.terms/term=enroll.mode._.choice.reason.md` — both disputes,
  with the dogfood table

## .the demos that RENDER this call

NONE directly — no `case=N` experience demo enrolls with a stated mode. ⚠️ that absence is itself the
tell: the mode axis reached the cli with no experience cell to grade its surface, which is how a value
could go a release with no flag and no row noticed it.

## .the verdict

**re-opened and landed at the wisher's word.** the record they asked for is this file: the deferral
had an argument, the argument was true of the wrong half of the question, and the absence it left hid
a silent-drop defect its own invariant forbids.
