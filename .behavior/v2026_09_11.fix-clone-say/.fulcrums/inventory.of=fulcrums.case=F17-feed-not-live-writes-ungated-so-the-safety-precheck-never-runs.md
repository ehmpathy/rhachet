# F17 — a `feed-not-live` dispatch writes UNGATED, so the dirty-box + modal precheck never runs

**rework** clean · **status** OPEN · **confidence** 68% — a safety consequence of the V7 / case=4
dispatch-blind choice, folded into the F06 + F07 wisher decision; the code behavior is the vision's
deliberate choice, so this entry surfaces the consequence rather than changes it

## .the fork, stated fairly

surfaced by the r011 (enroll-impl-arch-defects) L3 review. `genCloneSocketServer.ts:112-133` runs the
write-side safety gate — `computeCloneDispatchPrecheck` (dirty-box + modal detection, the V3 / case=2 /
case=6 mechanism) — **only** on the `screen.live` branch. a `feed-faulted` screen withholds. but a
`feed-not-live` screen **falls through and writes ungated** (the code says so, `:127-129`: it
"still PROCEEDS below, else it could never receive a say (V13, case=4 the honest degrade)").

so on `feed-not-live` the precheck is not "defaulted to refuse" and not "defaulted to force" — it is
**never called**. two populations reach this branch:

- **every clone, transiently** — the window between socket-`ready` and the emulator's first fed chunk.
  narrow and universal. V6 attaches the feed before the socket accepts, so this window is meant to be
  small, but it is not provably empty at the first dispatch
- 🔴 **durably** — any pty-clone whose `emulator` module failed to load (`getEmulatorModuleOrNull`
  returns `null` while `pty` still loads). for that clone's WHOLE life `readScreen()` reports
  `feed-not-live`, so the precheck runs **never**, and `--force` is meaningless because there is no
  precheck to force past

⇒ this is the **"no screen at all"** branch. F10 (async-parse race) and F11 (marker-whitelist)
both assume a live screen; none of F01–F16 names the no-screen write path.

| option | cost |
|---|---|
| **A** — keep the V7 dispatch-blind write (current). a `feed-not-live` say dispatches ungated and verifies by transcript (case=4) | a probe-blind clone at a permission prompt (case=6) or mid-type (case=2) receives an ungated paste, reported `released` / `enqueued` with only a "verified by transcript only" footnote — no refusal, no signal the gate did not run |
| **B** — refuse (withhold) on `feed-not-live` when case=6 is IN scope, the way `feed-faulted` already does | reverses V7 / case=4 (a probe-blind clone could never receive a say — the honest-degrade path the vision chose); a transient startup `feed-not-live` would refuse an early dispatch |
| **C** — split the two populations: the durable emulator-load-failure refuses (it is a real defect, never a transient), the transient startup window keeps V7 | needs a way to part "not yet attached" from "will never attach" — a lifecycle signal `readScreen` does not carry today |

## .taken, and why at the time

**A**, and surface the consequence — because the code behavior is the vision's DELIBERATE V7 /
case=4 choice (a probe-blind clone dispatches + verifies by transcript rather than refuse), already
documented inline at `:127-129`. to change it to B or C is a wisher-scope reversal of V7 that
`rule.require.review-test-changes` bars a driver from an unasked take. so this entry names the
consequence for the F06 / F07 verdict, rather than edits the write path.

## .rework, and why

**clean.** the repair this round is documentation — this entry + a case=4 write-side note. the CODE
choice (A vs B vs C) is the wisher's, and each is a bounded change (one branch on the `feed-not-live`
arm), never a ripple. no caller is hardened against the current ungated-write behavior.

## .why it folds into F06 + F07

it is the same collision those two entries already frame, at the no-screen branch:

- **F07** asks *is case=6 (never answer a permission prompt) in scope?* if YES, then a `feed-not-live`
  write that could land on a prompt is exactly the hole F07 wants closed — so B or C follows from an
  F07 = IN verdict. if F07 = OUT, A stands and this consequence is descoped with case=6
- **F06** sets *the modal refusal takes no override.* a `feed-not-live` screen cannot SEE a modal, so
  the modal refusal F06 guarantees is silently absent on this branch — a wisher who rules F06 should
  know its guarantee has a no-screen gap

⇒ so a wisher who rules F06 / F07 must see this branch, which is why the reviewer asked it be itemized
rather than left implicit in case=4.

## .confidence 68%, and why it is low

- it is a **scope call folded into F06 / F07**, and scope is the wisher's (`rule.always.defer-fulcrums-to-last`)
- the **transient window's real size is unmeasured** — V6 makes it small, but "not provably empty at
  the first dispatch" is a claim, not a measurement
- the **durable emulator-load-failure frequency is unmeasured** — how often `getEmulatorModuleOrNull`
  returns `null` on a real host is unknown; if it is never, only the transient population remains and
  this is an alterpath

## .where

- `src/domain.operations/clone/socket/genCloneSocketServer.ts:112-133` — the branch that writes ungated
- `1.vision.experience.case=4.an-older-daemon-cannot-answer-the-probe.md` — the read-side narrative
  this consequence extends to the write side
- `inventory.of=fulcrums.case=F06-refuse-is-the-default-and-modal-has-no-force.md` · `…case=F07-….md`
  — the two entries this folds into

### .the demos that RENDER this call

| demo | what it renders | marked unruled? |
|---|---|---|
| `case=4` | the probe-blind honest degrade — now extended with a write-side note that the precheck did not run on this dispatch | ✅ the case=4 note names F17 as the unruled write-side consequence |

## .the verdict

unruled. ⚠️ folded into F06 / F07 — a wisher who rules case=6 IN scope (F07 = A) makes the
`feed-not-live` ungated write a hole to close (option B or C here). if F07 = OUT, A stands and this
consequence is descoped with case=6, and still owes a caught dream per `rule.always.catch-dreams-for-followups`.
