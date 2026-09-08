# inventory: the fulcrums of `v2026_08_25.fix-node-pty-install`

each row is a fork this drive best-guessed rather than halted on
(`rule.always.defer-fulcrums-to-last`). the entry beside each row carries the fork as it stood, what
was taken, and why the reversal is clean.

## .the axis

`rework` — **clean** (a rename, a swapped default, a re-scoped boundary that does not ripple) vs
**dirty** (callers hardened against it, or later work built upon it). the council at the close sorts
on this column: a clean row costs a glance, a dirty one costs a teardown.

## .the entries

| case | title | rework | confidence | status |
|------|-------|--------|-----------|--------|
| F1 | pin a prerelease (`1.2.0-beta.15`) rather than hold at broken-on-linux stable | clean | 88% | taken |
| F2 | hold at `1.1.0` and ship the truthful report alone | clean | — | declined |
| F3 | swap to `@lydell/node-pty` platform packages | clean | — | declined |
| F4 | carry a self-built copy in our own tarball (the supply-chain refinement) | clean | — | deferred |
| F5 | run our own `node-gyp rebuild` at enroll time | clean | — | declined |
| F6 | leave `Libc`'s third member as `'unknown'` rather than conform it to `'unreadable'` | clean | 72% | ⚠️ **reversed** at i042 — renamed |
| F7 | keep the hint inline in the sentence, so the local path renders it twice | ~~dirty~~ → **clean**, once measured | 84% | ⚠️ **reversed** at i046 — cured |
| F8 | let the four role-package bumps ride this diff, and revert them at the rebase | clean | 91% | ⏳ open — deferred at i046 |
| F9 | scope the four re-lit arch lanes to `src/`, so test infrastructure goes unread | clean | 89% | ⏳ open — taken at i046 |
| F10 | defer the keyrack bare-sentence convergence for SCOPE, though the rework is cheap | clean | 76% | ⏳ open — deferred at i049 |
| F11 | revert the role-lookup hint rows, on a scope justification measurement refuted | clean | 94% | ⚠️ **reversed** at i065 — reverted |
| F12 | defer the DEAF-clone reach branch, on scope, though the seam is one boolean | clean | 82% | ⏳ open — deferred at i074 |
| F13 | the `clone say` header's full serial — reverted on the CLEAN test, then shipped | clean | 91% | ⚠️ **reversed** at i076 — unblocked |
| F14 | keep the raw socket trace ahead of the framed report, rather than gate or restyle it | clean | 79% | ⏳ open — taken at i076 |
| F15 | defer `execUpgrade`'s per-class hook policy, on a survey cost — the rework grade is UNDETERMINED | clean⇢dirty, per survey | 71% | ⏳ open — deferred at i076 |
| F16 | defer the two unrepaired mocked upgrade suites, on SIZE — the grade is clean and is not leaned on | clean | 87% | ⏳ open — deferred at i065 |

## 🚨 .the SECOND ledger — the forks a HUMAN must rule on, which this inventory did not hold

every `F` row above is **driver-owned**: a fork I best-guessed and can reverse myself. the forks that
need a **wisher** are filed in a different artifact entirely — the yield's `## open items` table — and
until i076 **no line in either pointed at the other.**

⚠️ **so the council that sorts on `rework` has never seen the rows where the rework is not mine to
do.** that is no gap in the rule; it is a gap in this route's application of it.

**they are cited here by their OWN ids, never re-numbered.** the yield states *"these ids are the
gaps' only ids"*, so a second `F` number per gap would be the exact duplication it forbids:

| open item | the fork the wisher must rule on | rework | status |
|---|---|---|---|
| 1 | is the literal `pnpm add -g rhachet` worth ~211mb of pack-and-install per clamp run? | clean | ⏳ open — holds acceptance #1 at 🟡 |
| 3 | the two-store trap — its own wish, or this one's? | clean | ⏳ open |
| 5 | the win32 install bound kills the shell, not the package manager | dirty — `spawnSync` cannot express a process-group kill | ⏳ open |
| 6 | a readme note for pnpm ≥11's nonzero local exit | clean | ⏳ open — dreamed at i056 |
| 12 | a named enroll gives no confirmation | clean | ✅ **RULED 2026-09-06** — reversed, shipped i074 |

### 🔴 what the split cost, measured on open item 12

**it was found, numbered, and owner-tagged `wisher` at i056 — and it ran five more rounds.** the
reviewer re-raised it every round; the yield recorded *"escalated, no wisher verdict"* every round.

⇒ **detection was never the failure.** the fork sat on the list with no council and no gate, while
the list WITH a council held only rows I could reverse myself. `rule.always.defer-fulcrums-to-last`
says a fulcrum is *"best-guess it, flag it, drive on"* and that the council runs **at the close** —
but a fork filed outside the inventory reaches no council at all.

⚠️ **and the two id spaces collide.** `F12` is *"defer the DEAF-clone reach branch"*; `open item 12`
is *"a named enroll gives no confirmation"* — two different forks, the same number, one route. any
prose that says *"item 12"* is ambiguous by construction. **cite `F12` or `open item 12`, never the
bare number.**

⇒ the transferable rule, and it is narrower than *"itemize your fulcrums"*: **a fulcrum is sorted by
its OWNER, and an inventory that holds only the driver-owned ones is a census of the forks that need
no council.** the rows that need one are the rows it lacked.

## .the counts

- **16 driver-owned, itemized** · 3 taken · 3 declined · 6 deferred · **4 reversed**
- **5 wisher-owned, cited above** · 4 open · 1 ruled
- **0 dirty** among the settled `F` rows — F7 carried the drive's only dirty grade, and the
  measurement at i046 retired it. ⚠️ **open item 5 is dirty**, so the drive's one dirty fork was never
  on the list the council sorts
- **1 UNDETERMINED** — F15's grade is a function of a survey that has not run, and its entry states
  the grade as that function rather than as a number. ⚠️ that is deliberate: per F7, an unmeasured
  `dirty` is what manufactures the permission to defer, so a row that cannot yet be graded says so

⚠️ **F6 is the first reversal, and it is the entry that justifies the whole inventory.** it was taken
at i041 and undone at i042, on the expiry condition its own entry named — and a peer lane cited the
entry back at the drive to trigger it. a fork held only in yield prose could not have been cited,
and so could not have been closed.

🚨 **F7 is the second reversal, and it carries a lesson F6 does not: the DEFERRAL was the defect, and
its own cost estimate was the cause.** the row was graded `dirty` on a *"19 files"* guess I wrote and
never re-measured across four rounds. the true seam was one test helper. `dirty` is the grade that
made the deferral defensible under `rule.always.defer-fulcrums-to-last`, so a wrong estimate did not
merely mis-sort the row — **it manufactured the permission to defer it.**

⇒ **a `rework` grade is a measurement, never an impression, and it expires.** the column the council
sorts on is the column most worth a re-measure before a row is deferred a second time. F7's entry
carries the full record.

🚨 **F11 is the third reversal, and it sharpens F7's lesson onto a second column: the SCOPE
justification is a measurement too, and mine was false.** the row's change was defended across four
review rounds as a *regression repair* — a claim that would have made it in scope — and one read of
`main`'s own snapshot refuted it. **F7 taught that a `rework` grade expires; F11 adds that a
`why-it-is-in-scope` claim was never measured at all.**

⇒ **the two columns fail the same way and are checked differently.** a rework grade decays with the
diff and wants a re-measure; a scope claim is false or true the day it is written, and wants the one
artifact that settles it. neither is an impression.

✅ **F10 is the first row where that lesson was applied BEFORE the grade was filed, rather than after
a reviewer cited it back.** its first draft read `dirty`, on an unmeasured assumption that a
convergence would move keyrack's snapshots; a read of the library's source showed the repair is
render-neutral, so the row is filed **clean** and the deferral rests on scope alone — a weaker
argument, honestly stated. **the value of F7 was that it changed what F10 says**, which is what an
inventory is for.

🚨 **F13 is where F7's lesson finally bit ME, mid-round, rather than four rounds later.** the row was
graded `clean` on an impression — *"one line"* — the repair was applied, and only then were the
clamps that move enumerated. the enumeration inverted the grade: the say header's only coverage is a
**realbrain** tier this round has no creds for, so the change would have landed two snapshots no run
here can verify. **the repair was undone in the same round it was made.**

⇒ **F13 sharpens what a `rework` measurement IS.** F7 taught that the grade expires and wants a
re-measure. F13 adds the unit: not *"how many lines"* but **"which clamps move, and can I run
them?"** a one-line change whose only clamp lives in an unrunnable tier is not clean, and line count
cannot see that.

🚨 **and F13 is the fourth reversal — the only one closed by its own stated expiry condition inside
the same round.** the entry named the blocker as a command (`rhx keyrack unlock --owner ehmpath
--env test`); the wisher supplied it; the repair went back in with no re-litigation. the realbrain
tier then **justified the deferral rather than merely closed it** — the two snapshots the entry named
went red, plus a third assertion no payload test could have caught, all three green on an independent
re-run.

⇒ **the transferable rule is narrower than "defer when unsure": a deferral owes its own expiry
condition, stated as a command or an artifact.** F6 closed on one; F13 closed on one within the hour.
a deferral with no such condition is an abandonment with a fulcrum attached — which is the shape F8
and F10 still carry, and worth a look before the close.

✅ **F12 is the second such row, and it goes one step past F10: it records the counter-argument
AGAINST its own deferral.** F10 could rest on *"another module entirely"*; F12 cannot, because the
defect was surfaced by a change made in this round, at the wisher's request. **the entry says so
outright** rather than let the scope justification carry weight it has not earned — which is the
F11 lesson (a scope claim is false or true the day it is written) turned inward on my own row.

## ⚠️ .the gap, stated rather than implied

**F1–F5 were reconstructed at i041 from `1.vision.yield.md`'s own `## the fulcrum` section, not
appended at the moment each was taken.** the rule requires the append at the moment
(*"never in a sweep"*), and this inventory did not exist for the first forty rounds — so what is
recorded here is the fork as the yield states it, never the live judgment as it stood.

what a swept record loses, and what these five entries therefore do NOT carry:

- the alternative as it was weighed **at the time**, before the outcome was known
- the confidence as it actually stood, which is why F2–F5 carry `—` rather than a fabricated number
- any fork that was taken and later became invisible because the yield ceased to cite it

⇒ **F6 is the first entry appended at the moment it was taken.** every entry after it is owed the
same.
