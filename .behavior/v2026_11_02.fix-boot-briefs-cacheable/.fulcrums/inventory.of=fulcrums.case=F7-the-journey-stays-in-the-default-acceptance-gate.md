# F7 — the brain-dir boot journey stays in the default acceptance gate

## .the fork

`blackbox/cli/brain-dir-boot.journey.acceptance.test.ts` spawns a real claude in a temp HOME, so its only
credential is the test key, and that key's balance is empty. two reads of the live-brain verdict (S2):

- **A** — the verdict covers the integration act/ask suites it named. the journey is acceptance, and
  `rule.allow.acceptance-spawns-real-brain-cli` keeps a real-brain acceptance test in the default gate.
  its red stays visible, owed, and holds no stone
- **B** — the verdict covers every live brain call. the journey's live steps move behind `LIVE_BRAIN=1`,
  and the default acceptance run goes green

## .taken

A. the verdict named the integration suites; the acceptance tier carries its own rule that forbids an
opt-in gate (`rule.forbid.faked-or-quarantined-acceptance`). no key is asked for either way.

## .rework

clean — B is a `given.runIf(RUN_LIVE_BRAIN_TEST)` on the journey's real-claude cases and an edit to
`rule.require.live-brain-tests-run-on-a-named-flag`'s scope table.

## .confidence — 70%

the verdict's principle (a live call is never a default dependency) reads as general, and B is what it
implies if so. A rests on the scope it named and on an extant acceptance rule.

## .where

- `blackbox/cli/brain-dir-boot.journey.acceptance.test.ts`
- `.agent/repo=.this/role=any/briefs/rule.require.live-brain-tests-run-on-a-named-flag.md`

## .verdict

settled B, 2026-11-04, by the director in the foreman seat: a test that needs a funded key is no credit
ask; it runs on the named flag and skips by default. applied at the block grain: the journey's [t3]
ask, [t3.1], the [t4] compact and respawn, [t6], and [t7] (it reads the [t3] turn's transcript); and
whole, `clone.screen-dogfood`, `clone.transcript-lag`, `replDoorRealSupplier.realnode` acceptance,
where every case needs a live answer. the two rules now agree on the boundary; that the director may
amend a repo rule is itself F20, for the council.
