# F37 — harden two test-infra time assumptions now, or defer?

- **rework** = clean
- **status** = **ANSWERED** — defer; both are argued in-artifact, and neither repair can be clamped
- **confidence** = 85%
- **where** = `blackbox/cli/roles.boot.performance.budget.acceptance.test.ts` (the latency bounds) ·
  `blackbox/.test/infra/enrollCloneHarness.ts` (`withHostFileLock`'s stale reclaim)
- **raised** = 2026-09-23, at `5.1.execution.from_vision` i016
  (`arch-hazards-behavior` nitpicks 1–2)

---

## .the fork

one lane read the behavior surface and found the same class twice: **a deliberate time assumption
in test infra**, each one a documented tradeoff, each graded `[nitpick][better]`, each raised at
i015 and again at i016.

| # | the site | the assumption | what the artifact already says about it |
|---|---|---|---|
| 1 | the perf suite's `avgMs < 600` / `avgMs < 2500` | a wall-clock mean holds on any host | 🔴 a **60-line docblock** that derives both bounds from a measured ~3.7x headroom ratio, refuses the borrowed absolute that flaked, gates the whole suite behind `RUN_PERF_TEST`, and cites two dreams for the contention class |
| 2 | `withHostFileLock`'s `age > staleAfterMs` (30s) | a holder never holds past 30s | a docblock table that states the lock's purpose and names reclaim-by-age as the chosen tradeoff against a wedged later run |

🟡 **neither is a case of an unconsidered hazard.** both sites already carry the argument the lane
re-raises, which is why both graded `better` and neither has ever named a shipped harm.

⇒ and the concern is **not** that a clamp is absent. it is that **the bar
`rule.require.clamp-edge-cases` sets — a test that goes RED under the un-fixed defect — cannot be
met at either site**:

| # | the repair the lane asks for | why its clamp cannot bite |
|---|---|---|
| 1 | a host-speed exclusion, so a red run is a signal rather than a flake | 🔴 **the clamp would have to slow the host down.** to prove an exclusion fires you must manufacture contention, and contention is the thing this family's two peer dreams already record as unmanufacturable |
| 2 | a lease renewal or a fencing token, so a live holder is never preempted | 🔴 **a race is not a fixture** — the interleaving needs two workers, a >30s hold, and a write ordering no test can statically construct. the identical bar deferred `F36` and the vanish peer |

| option | what it costs |
|---|---|
| **A** — harden both now: a host-speed gate on 1, a lease protocol on 2 | 🔴 **two production-path changes to test infra, neither clampable.** the lock change is the larger — `withHostFileLock` is the serialization every real-claude enroll rests on, so a protocol bug there converts a documented remote race into an undocumented common one |
| 🔴 **B** — defer, record the call | two known time assumptions stay, each argued in-artifact, each unenforced by a test |
| **C** — delete the two perf assertions, keep the measurement | 🟡 cheapest for row 1 and **wrong**: the bounds exist to catch the eager-construction regression the docblock measured at 1479ms vs 160ms. to drop them is to drop the one clamp `F1`'s whole design rests on |

---

## .taken, and why

**taken: B — defer, with the call recorded and the bound stated.**

1. **SAFE 🔴 / CLEAN ✅** (`rule.always.fix-forward-under-scouts-honor`). row 2 is the un-safe half
   and it is not narrow: a change to the lock protocol is a change to the one mechanism that
   serializes a write to a **real user file** (`~/.claude.json`). the CLEAN half is fine — both
   diffs would be small and local.
2. 🔴 **the asymmetry of row 2 decides it.** the extant defect is a race that needs a >30s hold to
   reach. a botched lease protocol is a race that needs **no unusual condition at all**. ⇒ to
   harden a remote race with an unclamped protocol change is to trade a rare failure for a
   reachable one, which is the wrong direction on the only axis that matters.
3. **both graded `[nitpick][better]`, twice**, and neither raise named a shipped harm. per
   `define.invariant.review.peer.budget.urgent-earns-budget` a `better` concern earns the floor and
   never more.
4. 🟡 **row 1 is skipped by default.** `RUN_PERF_TEST` gates the suite, so its blast radius today is
   a human who opted in — which is the lane's own stated reason for nitpick rather than blocker.

🟡 **and the counter-pressure is stated rather than buried: option C is available for row 1 and was
NOT taken, for a reason that cuts against this row.** the perf bounds are the only clamp behind
requirement 7's lazy-load design, so they are simultaneously the most flake-prone assertion in the
suite and the one it would cost the most to lose. ⇒ **this row keeps a clamp it admits is
host-sensitive, because the alternative is no clamp at all** — and a council may well prefer a
weaker clamp that never flakes to a sharper one that sometimes does.

---

## 🟡 .the residual 15% — "argued in-artifact" is not "enforced by a test"

both sites carry an excellent argument and neither carries a test that fails when the argument stops
to hold.

- row 1's ratio was measured **on one host, on one day**. the docblock says so plainly — *"every
  number above is an UNCONTENDED measurement, and that bound is stated rather than assumed"* — and
  no mechanism re-measures it. a slower runner moves the true baseline and the 3.7x headroom
  silently becomes 1.2x
- row 2's 30s is a constant with no derivation at all. the normal mutation is milliseconds, so the
  margin is large — and `large` is an estimate, never a measurement

⇒ so the deferral is honest about **what** it defers and weakest on **when the deferral expires**.
that is the 15%.

🔴 **the expiry is now SET, under `.what would flip it` below — a 2.0x headroom floor on row 1 and a
10s observed hold on row 2.** it narrows the 15% rather than closing it: a threshold that nobody
measures still never fires, and neither threshold fires on a clock.

---

## .what would flip it

- **a measured flake.** a red row in either site on a run nobody changed converts the class from a
  hazard to a live defect, and the clamp becomes urgent rather than better
- 🟡 **a portable way to manufacture either condition** — a host-speed harness for row 1, an fs/clock
  seam for row 2. the bar that defers this is *"a clamp with no teeth"*, so a fixture that bites
  removes the reason at that site and the row narrows
- **a second caller of `withHostFileLock`.** it serializes one write today; a second caller widens
  the window a stolen lock can corrupt, and the arithmetic in `.taken` row 2 changes sign

### 🔴 .the EXPIRY, set — added 2026-09-24

the three conditions above are **events**, and a later lane's objection was precise: an event with
no threshold and no date is not a trigger, it is a hope. *"at minimum these want a dated flip-trigger
the way `F30` got one, not an open-ended defer."* ⇒ conceded, and the residual 15% above is what it
names. the thresholds:

| # | the site | the measurable that expires it | how to read it, and when |
|---|---|---|---|
| 1 | the perf bounds | 🔴 **the headroom ratio falls below 2.0x.** it was **3.7x** on one host on **2026-09-23** — that number, that date, and no re-measurement since | re-measure the uncontended baseline on the **first run on a host other than that one**. under 2.0x the bound stops to be derived, and row 1 flips to option A |
| 2 | the 30s stale reclaim | 🔴 **a second caller of `withHostFileLock`**, or an observed hold past **10s** (a third of the reclaim) | the hold is measurable today — the lock file carries its own mtime, so a run that logs a >10s age has produced the evidence with no new instrument |

🟡 **row 1's threshold is derived rather than picked.** 2.0x is the point at which a host half the
speed of the measured one reddens the suite, and a 2x spread across CI runners is ordinary — so any
bound below it is a coin flip rather than a clamp.

⚠️ **and the honest bound on this expiry: neither threshold fires on a calendar.** both need a run
that somebody looks at, so a repo that never runs the perf suite never reaches condition 1. that is
weaker than `F30`'s trigger (*"a fifth repair to this unit"*, which a driver meets while they work),
and it is the residual this section narrows rather than closes.

---

## .see also

- `inventory.of=fulcrums.case=F36-add-a-fault-seam-to-clamp-three-documented-exits-or-defer.md` —
  🔴 **the same bar, one round earlier.** that row deferred three documented exits because every
  cheap fixture failed to bite; this defers two time assumptions for the identical reason. ⇒ the
  pair is the evidence that *"a clamp that cannot be built"* is a recurring class on this route
  rather than a one-off
- `.dream/2026_09_07.perf-suites-starve-a-cosheduled-network-install.dream.md` — the contention half
  of row 1's class, already dreamed
- `.dream/2026_09_18.three-integration-suites-fail-on-host-state-not-code.dream.md` — class 7, a
  threshold pinned to one host's throughput
- `rule.require.clamp-edge-cases` (mechanic) — the bar that defers both rows
- `rule.forbid.behavior-hazards` (behaver) — the rule the lane raised both under
- `rule.always.fix-forward-under-scouts-honor` (driver) — the SAFE/CLEAN test

---

## .the verdict, once ruled — (open; taken as **B** for this stone)

🟡 `open` carries the set's one sense: **open to the council's reversal**, never *nobody decided*.
