# S5 — the rescope: three live-brain tiers on the api key, no oauth token, rhachet only

## .said
(commander order 2026-10-31, via surdirector, rescopes this tree #675) no oauth token in tests; the credential ask is struck. (amend, bulletin live-brain-tests-three-tiers) the tiers replace the haiku-only line: (1) a critical safety guard (pii gate, secret guard) keeps its real-brain run at precommit; on cicd its integration test runs on a documented mock (.mock/.why/.real). (2) rhachet keeps a few acceptance smoke tests against the real brain. (3) every other live-brain test is skipped unless targeted by a named flag. haiku 5-5, narrow context, under $0.50 per test run. api key in tiers 1 and 2 only; no oauth token. scope: this tree cures rhachet only (#649 realbrain acceptance included). each repo also enbriefs the cost bound: a rule.forbid brief with its peer rule.always; it ships in the same pr as the cicd gate. (director) the key credit is not yours to settle and does not hold your push.

## .settled
- F3, F4 and the `CLAUDE_CODE_OAUTH_TOKEN` swap are struck; the manifest keeps `ANTHROPIC_API_KEY`; the globalSetup clamp and the pre-spawn token check go
- live-brain tests split into three tiers; tier 3 runs only under a named flag, never a silent skip
- this tree cures rhachet only; bhrain, bhuild, rhight gate their own tests in-tree; rhight's pii gate is tier 1, ruled
- the cost bound ships as a rule.forbid + rule.always pair, in the same pr as the gate
- the empty credit on the key does not hold the push

## .landed
- `src/.test/infra/describeBrainLiveOnDemand.ts` (the `BRAIN_LIVE_SCOPE=all` gate)
- `.agent/repo=.this/role=any/briefs/rule.forbid.live-brain-spend-beyond-the-smoke-tier.md`
- `.agent/repo=.this/role=any/briefs/rule.always.replace-spend-when-a-live-brain-test-changes.md`
- `5.1.execution.from_vision.yield.md` § rescope
