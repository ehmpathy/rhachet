# F5 — a keyrack daemon a test leaves is reclaimed, not red

- **the fork**: the run-id sweep finds keyrack daemons that tests started (a scoped run of `enroll.reach` + `keyrack.prikey` left 3). either (a) the sweep ends them and notes the count, and only other processes turn the run red; or (b) every test that unlocks ends its own daemon, and any daemon left turns the run red
- **taken**: (a) — reclaimed by the sweep with a one-line note; every other process left turns the run red
- **why**: the keyrack daemon is a session daemon by design: it outlives the cli call that spawned it, and holds its keys up to their ttl (it self-ends only when keyless and idle 15 min). a test cannot end it through the cli contract it tests, so its reclaim belongs to the harness — the same way autoprune reclaims the dirs. a brain stub or an enroll host, by contrast, is meant to end with its test, so a stray one is a defect and stays red
- **rework**: clean — the reclaim set is one predicate (`isProcessReclaimedByRun`); to make daemons red, drop it, then add a daemon teardown to each test that unlocks
- **confidence**: 70% — a reviewer may prefer per-test teardown so a daemon leak in prod code paths is caught; this choice reclaims them at the run's end rather than the test's, so daemons pile up through a long run (a few per keyrack suite)
- **where**: `blackbox/.test/infra/ReporterAcceptanceBox.ts`, `isProcessReclaimedByRun.ts`
- **verdict**: open
