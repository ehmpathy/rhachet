# rule.require.live-brain-tests-run-on-a-named-flag

> **a test that calls a live brain api runs only when the run names `BRAIN_LIVE_SCOPE=all`.
> a red from such a test is never answered by a credential ask.**

```ts
import { describeBrainLiveOnDemand } from '@src/.test/infra/describeBrainLiveOnDemand';

describeBrainLiveOnDemand('actor.act (integration, live haiku)', () => {
  given('[case1] …', () => { … });
});
```

```sh
BRAIN_LIVE_SCOPE=all rhx git.repo.test --what integration --mode apply --scope 'path://src/domain.operations/actor'
```

## .why

- a live brain call spends a paid key and waits on a remote model. the default tiers must not hang
  on either: a drained balance turned six suites into 180s timeouts and one crashed worker
- rhachet selects and wires a brain; the supplier package owns the proof that its brain answers. a
  default run that depends on a remote balance tests the balance, not rhachet
- ⇒ the call stays in the tree, one flag away, for the caller who targets it

## .the mechanism

- `describeBrainLiveOnDemand` runs its describe under `BRAIN_LIVE_SCOPE=all`; else it skips it by
  name, beside a todo row that names the flag, so the report shows every gated suite and how to run it
- `isBrainLiveScopeAll` is the one reader of the flag. a value other than `all` or unset fails loud,
  so a typo never reads as a green run. a block inside a gated describe may read it to state its own
  dependence on a live answer
- a gated body registers at collection even when skipped: it does no i/o and reads no credential at
  collection; defer each into a `beforeAll` or a getter

## .scope

| gated | not gated |
|---|---|
| a suite whose asserts call a brain api (`brain.act`, `brain.ask`, `actor.act`, `actor.ask`) | a test that throws before any call (allowlist refusal, absent arg) |
| an acceptance suite whose asserts need a live answer that spends the paid test key | a solid skill (`actor.run`), a stub brain, a stub brain-cli fleet |

## .the boundary with failfast

`rule.require.failfast` forbids a skip on an ABSENT resource. this flag is not a resource probe: it
never reads a key or a balance. it is a declared opt-in. a test that runs under the flag and lacks
its credential still fails loud.

## .enforcement

- a default-run test that calls a live brain api = **blocker**
- a gate keyed on a credential's presence rather than the named flag = **blocker** (that is a failhide)
- a live-brain red answered by a request to top up a key = **blocker**

## .see also

- `src/.test/infra/describeBrainLiveOnDemand.ts` — the gate
- `src/.test/infra/isBrainLiveScopeAll.ts` — the flag
- `rule.require.test-claude-cli-against-haiku` — the brain a flagged run uses
- `rule.allow.acceptance-spawns-real-brain-cli` — the acceptance tier this rule bounds
