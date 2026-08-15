# inventory of clamp — reviews-flagged behavioral clamps

## .what

a catalog of the **behavioral clamps** the peer reviews of `3.3.1.blueprint.product` flagged — one row
per flagged behavior that, without a dedicated regression test, would break silently. each is a **clamp**
per `rule.require.clamp-edge-cases`: a test that goes **red the moment the path breaks** (dogfooded — revert
the fix, the clamp reddens). this inventory itemizes them so a reviewer-surfaced gap is a tracked, owned
test, never prose buried in the blueprint.

## .why

the two L3 lenses (arch-defects r011, behavior-intent r012) exhibit a **treadmill**: each legit fold
surfaces the next legit seam. that is genuine convergence, not an insatiable reviewer — but it means the
set of behavioral clamps grows round-over-round. this inventory is the durable ledger of that set, so:

- no flagged behavior is lost between review rounds
- the 5.1 execution stone has an explicit checklist of the tests it must build (each clamp = one required test)
- a future reviewer can confirm every flagged gap has a clamp, not a promise

## the clamps

| # | flagged | behavior (silent-break without the clamp) | clamp (red-before / green-after) | owning test | status |
|---|---------|-------------------------------------------|----------------------------------|-------------|--------|
| C1 | i050 r011#2 + r012#2 | brain exits with N `say`s still `queued` → each caller burns its own WEDGED timeout independently (a "thundering timeout"), instead of one exit fanning out N immediate rejections | N queued dispatches + brain exit → all N receive an **immediate `rejected`** ack naming the exit cause, none waits out a WEDGED timeout; dogfood: a bare `server.close()` (no drain) leaves N callers hanging → red | `genCloneWriteQueue.integration` (drain fan-out) + `enroll-lifecycle.acceptance` (brain-exits-mid-dispatch at the real process boundary) | folded i050 |
| C2 | i050 r012 (new) | `node-pty` LOADS but `pty.spawn()` fails at call time (`/dev/ptmx` EACCES/ENOENT in a sandboxed container — a common brain-CLI host) → enroll hard-fails instead of falling back | mocked `pty.spawn` throws a pty-device error → **plain-spawn fallback + loud notice**, `socketEligible=false`, brain still opens, `clone list` → NOT-REACHABLE; a **non-device** spawn error **re-throws** (allowlist discipline, not a swallow) | `genBrainCliPtyClone.integration` (spawn-time allocation fallback row) | folded i050 |
| C3 | i050 r011#1 | `enrollment.jsonl` appends unconditionally, incl. the pure live-slug-reuse path → the wish's headline cron (`--as @:driver` every 5min) grows the audit log by one line per tick forever | a 2nd `--as @:driver` against a **LIVE** owner → log line-count **unchanged** (pure reuse records no event); a bake/rebind **DOES** append; N cron reuse-ticks leave the log at its original count | `clone.acceptance` (LIVE-SLUG-REUSE → NO AUDIT-LOG APPEND) | folded i050 |
| C4 | i049 r012 → i050 r012 → i005 r010 (corrected) | bare `rhx enroll` is create-always → a misconfigured retry-cron silently accrues billed brains with no cap/warn | enroll past `CLONE_ACCRUAL_THRESHOLD` live clones → **soft stderr WARN + exit 0** (enroll still succeeds; a hard cap would fight the parallel-clone motive) + a structured `accrualWarn` json field; **below** the threshold → warn absent | `computeCloneAccrualWarn.test` (pure classify — BUILT) + `getOneCloneLiveCountForActor.integration` case2 (the live count REACHES `CLONE_ACCRUAL_THRESHOLD`, the warn INPUT, via cheap sockets — BUILT i005); the `invokeEnroll.ts` CLI emit (a thin `if (accrual.warn)` branch over the two tested grains) — **DEFERRED acceptance clamp** | corrected i005 r010: the false "confirmed built" is RETRACTED — the `clone.acceptance` "accrual case" was NEVER authored (verified — zero `accrual` matches in `blackbox/`). true status: the pure classify + the count-reaches-threshold wire-up are now BUILT (i005); the CLI stderr/json EMIT is a **documented deferral** — it needs `CLONE_ACCRUAL_THRESHOLD`(=5) concurrent live ptys, the SAME cost/flakiness basis on which `clone.mid-response` + `clone.samecwd-race` were deferred, and it is a thin branch over the two now-tested grains (low residual risk) |

## non-clamp items the same reviews flagged (tracked, but not behavioral clamps)

these are **not** red-before/green-after behaviors, so they are not clamp rows — recorded here so the
inventory is exhaustive against the reviews, not silently partial:

- **shared `CloneUnreachableCause` hint vocabulary** (i050 r011) — a refactor collapsing three "can't reach
  it" advisories into one union; correctness is covered by the extant hint unit tests, not a new clamp.
- **`--reason` criteria backfill** (i050 r011#1 nitpick / r012#1) — a spec-doc addendum into
  `2.1.criteria` usecase.11; folded, no behavioral test owed beyond the extant `--reason` capture test.
- **`clone/` flat-folder consistency** (i050 r011#4 / r012#4) — a cosmetic placement call, held with the
  3-files-compose-a-subfolder principle; no behavior changes.
- **7th deferred cleanup item — enrollment.jsonl rotation** (i050 r011#1 / r012#3) — a `rhx clone` dream
  lifecycle concern; the *reuse* half is clamped (C3), the long-lived-log-growth residual is a deferral,
  not a clamp.
- **r009 journey re-certification** + **r010 human snapshot eyeball** (i050 r012 process gaps) — a process
  re-run and a human spot-check; owned at the j2 gate, not a test to author here.

## see also

- [`3.3.1.blueprint.product.yield.md`](./3.3.1.blueprint.product.yield.md) — the blueprint whose test-tree
  owns these clamps; its "experience-inventory traceability" table maps user experiences → clamps, and its
  "open decisions ledger" carries the round-by-round provenance (`iNNN`/`rNN`) distilled out of these rows.
- `rule.require.clamp-edge-cases` — the discipline every row above satisfies (test goes red when the fix reverts).
