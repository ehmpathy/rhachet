# F5 — the tier-3 flag is a bare `BRAIN_LIVE_SCOPE=all`

## .the fork
- (a) a bare name a human types, as the extant on-demand perf flag `PERF` is (`blackbox/.test/infra/RUN_PERF_TEST.ts`)
- (b) the `RHACHET_TEST_*` prefix, as the stub knobs are (`RHACHET_TEST_HOST_LIBC`, `RHACHET_TEST_PTY_SPAWN_ERROR`)

## .taken
(a). the `RHACHET_TEST_*` vars are knobs a test sets for its own stub; a human never types them. `BRAIN_LIVE_SCOPE` is typed by a human to opt into spend, the job `PERF` does. the value `all` leaves room for a narrower scope later with no new flag.

## .rework
clean: the constant `BRAIN_LIVE_SCOPE_FLAG` in `src/.test/infra/describeBrainLiveOnDemand.ts`, its unit test, the two cost-bound briefs, and the yield. callers read the constant, not the string.

## .confidence = 80%
two conventions coexist and neither is declared as the one for a test flag a human sets; i read the nearer peer, not a rule.

## .where
`src/.test/infra/describeBrainLiveOnDemand.ts`; `rule.forbid.live-brain-spend-beyond-the-smoke-tier.md`; `rule.always.replace-spend-when-a-live-brain-test-changes.md`.
