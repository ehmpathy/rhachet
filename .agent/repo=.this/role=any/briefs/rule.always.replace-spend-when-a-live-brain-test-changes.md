# rule.always.replace-spend-when-a-live-brain-test-changes

> **each time you add or grow a live-brain test, cut at least as much live spend in the same change,
> and say where.**

the peer of `rule.forbid.live-brain-spend-beyond-the-smoke-tier`: that rule fixes the budget; this
one is the act each change owes against it.

## .the act, at the moment of the change

| when you… | then, in the same change… |
|---|---|
| add a test that calls a real brain | put it in tier 3 (`describeBrainLiveOnDemand`), or retire a smoke call of at least its cost |
| raise a model past haiku | cut a call or a context of at least the price gap |
| grow a prompt or the context a test hands the brain | trim it back, or cut a call to match |
| promote a tier-3 suite to the smoke tier | demote or retire one of at least its cost |
| find two `then` blocks that each call the brain | share one call (`useThen`) |

and state the trade in the pr: the spend added, the spend cut, the tier each test lands in.

## .the test

> **does this change leave live spend per cicd run at or below where it found it?**

yes → proceed. no → cut, or move the test behind the flag.

## .enforcement

- a change that adds live spend and names no cut = **blocker**
- a pr that moves live spend with no trade stated = **nitpick**

## .see also

- `rule.forbid.live-brain-spend-beyond-the-smoke-tier` — the tiers, the gate, the bound
