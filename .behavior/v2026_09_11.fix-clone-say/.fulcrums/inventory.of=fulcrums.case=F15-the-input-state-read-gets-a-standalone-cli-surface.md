# fulcrum F15 — the input-state read gets a standalone `clone get` / `whoami` CLI surface

**rework** clean · **status** OPEN · **confidence** 45% (was 70% — the wisher voiced the use case, see below)

## .the fork

the r011 (arch-defects) L3 review, item 4: the vision names `get` as the read channel's spine
(*"`say` leverages `get` under the hood... `get` reads the clone's input state"*, and *"`clone get`
reports whether the screen carries buffered or enqueued input"*). but neither `invokeCloneGet.ts`
(`rhx clone get`) nor `invokeCloneWhoami.ts` calls `getCloneInputState` — the socket `probe` verb is
exercised ONLY internally by `say`'s own baseline + observe loop. so today a human or a supervisor
daemon cannot ask "is this clone's box dirty / does it hold anything queued right now" WITHOUT a
dispatch attempt that side-effects.

two ways to close it:

- **option A — expose the read on the CLI now.** wire `getCloneInputState` into `rhx clone get`
  (and/or `whoami`) so the input-state classification (focus / region / counts) is a first-class
  read a caller can take standalone.
- **option B — defer it, itemized (this fulcrum).** the standalone CLI surface is a SEPARATE
  deliverable from the primary ask (fix `say`'s false failures). `say` uses the probe internally and
  every R/V requirement in the vision's table is met without the standalone `get` surface. this
  fulcrum is the wisher-visible record of the deferral, alongside F13 (model-on-`clone get`).

## .taken, and why

**option B — deferred, itemized here, and flagged EXPLICITLY to the wisher** (the reviewer asked for
an explicit call-out, not a silent cut). the primary ask (R1: a landed say no longer reports failure)
is met by the internal probe; R3's part (tell buffered/enqueued/absent apart) is met on the `say`
surface. the vision's `clone get` CLI wording (V4) is a design statement of where the read LIVES, and
whether THIS stone ships the standalone human/daemon read — versus a follow-up — is a scope call the
wisher owns, not one I settle by a silent new CLI surface built late in the stone.

⇒ this is `rule.always.raise-a-blocker-a-taken-cannot-close`'s fulcrum case: a scope decision reserved
for the wisher, handed up rather than argued down by side effect.

## .rework — clean

option A is additive: `getCloneInputState` already exists and is proven at the integration grain; a
wire-in to `invokeCloneGet` adds a read path + output fields, and no caller of the extant `clone get`
output breaks (the machine channel is additive, V13). so a later verdict to expose it is a clean
forward step, never a teardown.

## .confidence — 70%, and why

70% that the deferral is right for THIS stone: the primary ask and every R/V requirement are met
without the standalone surface, and a new CLI read added late in an execution stone is scope creep a
wisher should price. the 30% doubt is whether the wisher reads V4's *"`clone get` reports ..."* as a
HARD deliverable of this stone rather than a design statement — which is exactly why it is a fulcrum
raised explicitly rather than a silent skip.

## .where

- the r011 given — `.reviews/peer/5.1.execution.from_vision._.review.i004.1fea0181274cdebb5f.r011._.given.by_peer.enroll-impl-arch-defects.md` (item 4)
- the vision spine note — `1.vision.yield.md` (*"`get` reads the clone's input state"*, V4)
- the CLI that does not yet call it — `src/contract/cli/invokeCloneGet.ts`, `src/contract/cli/invokeCloneWhoami.ts`
- the read it would wire in — `src/domain.operations/clone/socket/getCloneInputState.ts`
- the kin deferral — F13 (`inventory.of=fulcrums.case=F13-the-brain-model-rides-clone-get.md`)

## .also folded in — the `--await release` full-bound cost (r010 i007 nitpick)

the enroll-impl-behavior-intent r010 review named a concrete daemon cost: `say --await release`
has no early-return, so every call against a mid-turn brain polls until the hardcoded
`CLONE_SUBMIT_VERIFY_TIMEOUT_MS` (15s) elapses before it reports back. a supervisor daemon that
wants cheap "did it finish yet" semantics pays that full bound on every poll.

⇒ this is exactly the escape hatch option A buys: a standalone `clone get` read of the input state
is O(one probe), so a daemon polls the read directly and never pays a 15s say to learn where a prior
message sits. so the deferral of F15 is not free — it leaves a daemon author on the full-bound path
until the standalone read ships. recorded here as the concrete cost that raises F15 from an
architectural nicety to a measured daemon expense, per `rule.always.catch-dreams-for-followups`'s
fold-into-fulcrum shape (a cost estimate that made a deferral a judgment).

## 🔴 .the wisher touched this fulcrum, 2026-09-21 — and their ask is option A

a self-say refused against the wisher's own box (`withheld` / `input-region-dirty`, exit 2), and they
asked of the refusal: *should it say what is in the input, so the person who attempted to write can see
what was inflight — and even see whether the message continues to expand or has paused?*

⇒ that is option A's use case, stated from the caller's seat rather than the architecture's: a read of
the box, taken WITHOUT a dispatch, and taken **twice** so a live typist parts from inert output.

what is knowable today, and what is not:

| the ask | reachable now? |
|---|---|
| **what** the box holds | ✅ yes — the grid ships under `--debug` (`computeCloneSayDebugReport` renders both intensities with row indices) |
| **whether it grows** | ✅ two `--debug` reads a second apart, by hand |
| either, **without a dispatch attempt** | 🔴 **no** — this fulcrum. the screen probe has no standalone CLI surface |
| either, **reported by the refusal itself** | 🔴 no — and the copy never even named the `--debug` path |

⇒ the last row was a pure copy gap, so it is fixed forward now: the `input-region-dirty` hint names the
two-read method and both causes of inert text (`computeCloneSayReport`). that is the CLEAN half, and it
needs no wire field, no new CLI verb, and no wisher call.

🟡 **the two rows above it are still option A**, and the cost of the deferral is now measured from the
wisher's own seat rather than a daemon author's: to answer *"what is in my box?"* a caller must attempt
a say that may clobber it.

⇒ **confidence on the deferral drops to 45%** (was 70%). the wisher has now voiced the use case
unprompted, which is the strongest evidence a deferred surface is wanted — and it remains theirs to
price, since option A is a new CLI read added late in an execution stone.

🟡 a REPORTED size + growth delta (over a hand-run pair of reads) would need the box's char count on the
wire, which is a required field every live daemon lacks — so every extant clone degrades to probe-blind
until re-enrolled. that makes the reported form **dirty**, where the standalone read stays clean. the two
are separable and should be priced separately.

## .the demos that RENDER this call

**NONE.** the seven `case=N` demos render `say`'s verdicts, never a standalone `clone get` input-state
read. a verdict on F15 adds or defers a CLI surface but changes no demo and seeds no criteria
assertion.

## .the verdict

🔴 **RESOLVED 2026-09-21 — option A. the deferral was WRONG.** the wisher ruled it in one sentence and
named the surface: `rhx clone get --what buffer|queue|story`, `story` the default.

### what shipped

| `--what` | reads | source | works on a DEAD clone? |
|---|---|---|---|
| `story` (default) | the transcript | DISK | ✅ yes |
| `buffer` | the input box's rows | the live SCREEN, over the socket | no |
| `queue` | the rows the brain holds unreleased | the live SCREEN, over the socket | no |

⇒ the three map 1:1 onto `define.brain-cli-input-states`' triple — `buffered` · `enqueued` ·
`released` — so the flag needed no vocabulary of its own. **`story` as the default keeps every extant
`clone get` caller byte-identical** (`rule.require.review-test-changes`), which is what made a late
surface addition safe rather than dirty.

### 🔴 the lesson is the CONFIDENCE FIGURE, not the outcome

this entry recorded its own refutation a day before it arrived:

> *"confidence on the deferral drops to 45% (was 70%). the wisher has now voiced the use case unprompted,
> which is the strongest evidence a deferred surface is wanted"*

⇒ and the drive deferred it anyway. **a fulcrum below ~50% has stopped to be a best-guess** — it is a
call the drive expects to lose, and `rule.always.defer-fulcrums-to-last` never asked for that: it asks
for a *defensible* guess, and a sub-coin-flip is not one. the correct move at 45% was to surface it as
a question rather than carry it as a guess.

🟡 **the record still did its job.** because the row named the drop AND its cause, the wisher could rule
it without a re-derivation — which is the whole argument for the inventory, even on a row it got wrong.

### what the cure found on its way in

the surface was not a thin wrapper — it surfaced two defects of its own, both now fixed and clamped:

- 🔴 **a false clear** — a modal or unrecognized screen has no locatable band, so the content read
  honestly returned zero rows, and zero rows rendered as *"the input box is clear"*. the exact
  `rule.forbid.failhide` shape, with `case=6`'s safety consequence behind it: a caller told *"clear"*
  sends a say whose `\r` answers a permission prompt. cured by a focus check placed BEFORE the empty
  check; clamped at unit grain (`asCloneInputSurfaceText.test.ts`) and CLI grain (`[case10] [t2]`)
- 🔴 **the queue walk ran past a rule** — it stopped only at a blank row, so on any screen where the
  queue abuts the rule above it the walk captured the prior box's chrome as a held message. cured with
  a `blank OR rule` boundary off `isRuleRow`, the same structural signal `getInputBand` rests on; the
  clamp was mutation-proven (reverted → red, restored → green)

⇒ neither was found by a failed test. the first came from a read of the new render against
`rule.forbid.failhide`; the second from a read of the stub's `busy` fixture. ⇒
`rule.require.clamp-edge-cases`.
