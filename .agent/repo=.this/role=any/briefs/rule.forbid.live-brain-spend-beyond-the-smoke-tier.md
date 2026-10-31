# rule.forbid.live-brain-spend-beyond-the-smoke-tier

> **a live-brain test bills the anthropic api on every run. on cicd, the smoke tier is the whole
> live budget. every other live-brain test runs only on demand, by a named flag.**

## .the three tiers

| tier | what | where it runs live | credential |
|---|---|---|---|
| 1 | a critical safety guard (a pii gate, a secret guard) | its real-brain run at precommit; on cicd its integration test runs on a documented mock (`.mock` / `.why` / `.real`) | api key |
| 2 | rhachet's acceptance smoke tests | cicd and local, every run | api key |
| 3 | every other live-brain test | only when `BRAIN_LIVE_SCOPE=all` | api key |

rhachet holds no tier-1 guard. its tier 2 is `blackbox/cli/clone.realbrain.acceptance.test.ts` —
one real enroll, one say, one reply, on haiku with a narrow context. the bound is **under $0.50 per
test run**, for the whole tier.

## .the gate

- tier 3 wraps its suite in `describeBrainLiveOnDemand` (`src/.test/infra/describeBrainLiveOnDemand.ts`)
- with no flag, the suite is skipped **by name**: its title carries
  `[gated: tier-3 live brain; run with BRAIN_LIVE_SCOPE=all]`, so the verbose report lists each one
  and how to run it. never a silent skip
- to run them: `BRAIN_LIVE_SCOPE=all rhx git.repo.test --what integration --mode apply` (or `acceptance`)
- cicd sets no flag, so cicd runs tier 2 only

## .what is forbidden

- a new live-brain test, unless it replaces spend of at least its own size
- a larger model (past haiku) or a longer prompt or context in a live-brain test, under the same bound
- a tier-3 suite that runs without the flag
- a gate that skips with no name and no flag in its title
- an oauth token as a test credential; tiers 1 and 2 run on the api key, and no tier uses another

## .why

the api credit is spent per call. a test that calls a real brain on every push charges every push,
in every repo, for a fact the smoke tier already proves. a cheap path tested free is worth more than
a dear path tested on every run.

## .enforcement

- a new live-brain test that adds spend with none removed = **blocker**
- a model or prompt raised in a live-brain test with no spend cut to match = **blocker**
- a wasteful test against the api (a repeat call, a needless model, a fat context) = **blocker** in review
- a tier-3 suite outside `describeBrainLiveOnDemand` = **blocker**

## .see also

- `rule.always.replace-spend-when-a-live-brain-test-changes` — the act each change owes
- `rule.require.test-claude-cli-against-haiku` — the model the smoke tier runs on
- `rule.forbid.redundant-expensive-operations` (mechanic) — one call, shared across `then` blocks
