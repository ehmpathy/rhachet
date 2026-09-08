# F13 — the `clone say` header's full serial: REVERTED on the CLEAN test, then shipped

- **rework** = clean
- **confidence** = 91%
- **status** = ✅ settled — deferred for want of runnable clamps, **reversed the moment the clamps
  became runnable**; the transformer and all six call sites shipped in the same round
- **where** = `src/domain.operations/clone/asCloneAddressHuman.ts` (the one owner) and its six
  callers; caught in `.dream/2026_09_06.whoami-and-prune-still-render-the-full-serial.md`

## .the fork, stated fairly

this round moved `asCloneReachBreadcrumb` to the 8-hex short serial at the wisher's direction, then
added a second branch so it names both `clone say` and `clone get`. a sweep for the same defect
found **five** human-faced clone-address renders, three of which still show the full 36-char form —
`clone say`'s header, `clone whoami`'s tree, and `clone prune`'s tree.

the fork: **repair the `say` header now, or defer all three?**

the case FOR a now-repair was not scope-neutral, and that is what made it a real fork rather than an
obvious defer: **this round authored the mismatch.** before the change, the breadcrumb and the say
header were consistent — both long. the breadcrumb moved and the say header did not, so a bare-enroll
human is now handed an 8-hex address and sees a 36-char one echo back from the very command the
breadcrumb pointed them at. that is a regression I introduced, not an arrears I inherited, and
`rule.prefer.scouts-honor` reads squarely on it.

## .taken, and why — at the time

**repaired first, then reverted.** the sequence is the substance of this entry:

1. the SAFE/CLEAN test was run and answered **clean** — *"one line, plus `clone list`'s own
   projection, and the json channel is untouched"*
2. the import and the two-line change were applied
3. **then the snapshots that move were enumerated**, and the answer changed: the serial-addressed say
   header has **no runnable coverage** (`src/**/*.test.ts` for `said to` → not one match). its only
   clamps are two **realbrain** acceptance snapshots — `clone.realbrain`,
   `clone.saybulk-probe.realbrain` — which need a real authenticated claude that this round has no
   creds for
4. so the change would land two hand-edited snapshots that **no run on this branch can verify**,
   which is exactly what `rule.require.snapshot-verified-on-independent-run` forbids
5. reverted, and folded into the dream with `whoami` and `prune`

🚨 **the CLEAN grade was wrong when first given, and it was wrong for the F7 reason.** F7's lesson is
that a `rework` grade is a measurement and not an impression. mine was an impression — *"one line"* —
taken before I enumerated which clamps move. **the enumeration IS the measurement**, and it inverted
the answer.

⇒ what F13 adds to that lesson: the measurement is not *"how many lines"* but **"which clamps move,
and can I run them?"** a one-line change whose only clamp lives in an unrunnable tier is not clean.

## .the rework, and why it is clean

the deferral is reversible by a plain re-apply: one transformer, five call sites. it is clean because
no later work builds on the long form — every consumer that needs the canonical serial reads the json
channel, which this change never touches.

⚠️ **and the dream names the ROOT rather than the three symptoms**, which is what makes the deferred
work coherent: `slug ?? serial` is inlined at five call sites and owned by none. the repair is one
`asCloneAddressHuman` transformer they collapse onto — so a sixth render cannot repeat the defect.
three per-render patches would leave the class alive.

## ⚠️ .the counter-argument against this deferral

stated because F12 set the precedent and this row needs it more, not less:

**I authored the inconsistency this round.** the honest read is not *"three renders were already
wrong"* — it is *"two renders agreed until I moved one of them."* a deferral of a defect the round
itself created is a weaker position than a deferral of an inherited one, and no scope argument closes
that gap.

what makes it defensible rather than merely convenient:

- the residual is **cosmetic, not functional** — `getOneCloneBySerialPrefix` resolves any hex body of
  4+ chars, so the 8-hex address the breadcrumb hands over **works** when pasted into `say`. the human
  sees a longer echo; they do not hit an error
- the alternative is worse in kind, not merely in size: an unverifiable snapshot edit is a **false
  green**, and a false green is the failure mode this whole round has spent its budget to retire
- the deferred unit is coherent and small — one transformer, five sites, one resnap pass — and it is
  strictly cheaper done once with creds than split across two rounds half-verified

⇒ the honest summary: **the deferral is right, and it is not free.** the residual is recorded in the
dream in the same words rather than softened there.

## .the verdict

✅ **settled by the deferral's own expiry condition, not by a second judgment.** this entry named
the condition verbatim — *"which needs `rhx keyrack unlock --owner ehmpath --env test` for the
realbrain tier either way."* the wisher unlocked sso, the condition was met, and the deferral was
reversed the same round rather than carried to the council.

what shipped: `asCloneAddressHuman`, one owner, with **six** call sites collapsed onto it — the say
header, `clone get`, `whoami`'s two renders, `clone list`, and `clone prune`. (the sweep found five
render sites plus the breadcrumb, which is the sixth.)

🚨 **and the realbrain tier justified the deferral rather than merely closed it.** the two snapshots
this entry named as the say header's only clamps —

```
- 😶🎙️ said to @:__SERIAL__
+ 😶🎙️ said to @:__SERIAL8__
```

— went **red on the change** in `clone.realbrain` and `clone.saybulk-probe.realbrain`, then green on
an independent re-run with no `-u`, 27/27 against the 27/27 baseline taken before the change. a third
red surfaced in `clone.joker.realbrain` [t7], a `toContain(scene.serial)` on the whoami tree that no
payload test could have caught.

⇒ **the clamps were real, they did bite, and they were unrunnable at the moment the grade was given.**
had the change landed at i075, those three reds would have shipped as hand-edited green.

## ⚠️ .what this row is evidence FOR — and what it is not

it is **not** evidence that deferral is the safe default. the deferral was right for about an hour,
and it was right for one checkable reason: **a named, expirable blocker.** the entry stated the
unlock command by name, so when the wisher supplied it, the reversal needed no re-litigation.

⇒ the transferable rule is narrower than *"defer when unsure"*: **a deferral owes its own expiry
condition, stated as a command or an artifact.** one with no such condition is not a deferral; it is
an abandonment with a fulcrum attached.
