# F24 — the live-brain gate and the ci gates stay as main ships them, at 5.3

## .the fork

stone 5.3 asks for zero skips and to fix every skip found, whoever wrote it. the integration run
reports 18 skipped tests, and a scan finds three more gate shapes:

| gate | where | what it skips |
|---|---|---|
| `describeBrainLiveOnDemand` — runs only at `BRAIN_LIVE_SCOPE=all` | `actorAsk`, `actorAct`, `invokeAct`, `genActor.brain.case*` (18 tests) | live brain calls, real money per run |
| `given.runIf(RUN_PERF_TEST)` | the eight `*.performance.*.acceptance.test.ts` | perf budgets, run by the ci perf job |
| `given.runIf(!process.env.CI)` | `invokeImagineStitcher`, `enweaveOneStitcher` integration | live imagine calls, off in ci |

- (a) leave each gate as main ships it, and name each in the 5.3 yield
- (b) remove the gates and run every gated suite in this pr

## .taken — (a), and why at the time

- every gate is declared and named, never silent: the live-brain gate prints a todo row that names
  its flag; the perf and ci gates are named in the test title and run in their own ci jobs
- this branch changes none of those files (`git diff --stat origin/main` is empty for all of
  them), and none of the gated suites reads the mods code
- (b) would spend real money on each run, which is the reason the gate exists, and would change
  behavior this pr was not asked to change (`rule.require.review-test-changes`)

## .rework

clean — a later pr can remove a gate and leave the mods code alone.

## .confidence — 85%, and why it is not higher

the stone's text reads "fix it anyway" for prior skips. a reader could hold that it covers a
declared cost gate too.

## .where

- `src/.test/infra/describeBrainLiveOnDemand.ts`
- `.behavior/v2026_10_16.feat-role-edit-overlay/5.3.verification.yield.md`

## .verdict

open
