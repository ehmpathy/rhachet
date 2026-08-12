# domain.term.choice.reason: sweep

## .etymology

from the physical sweep — **one pass over a whole area, which gathers whatever is there**. the word
carries two things no alternative does:

1. **the members are found, never chosen.** you do not pick what a broom collects; the area decides.
   that is exactly the keyrack case — a sweep's keys come from the repo manifest or the env, and the
   caller names not one of them
2. **the shape is the pass, never the pile.** a sweep of a small room is still a sweep. so a repo
   that declares one key is still on the sweep path, with every property that follows

## .why not `bulk` — the dispute that decided the word

`bulk` was the incumbent: the code says *"a bulk unlock"*, *"a BULK source"*, *"a bulk sweep"*
throughout, and the guard's own `.what` header reads *"refuses a reach that rides a BULK ask"*.

it loses on one argument. **`bulk` names volume; `sweep` names shape.** the distinction is not
stylistic — it decides whether a sentence is true:

| the case | *"a bulk ask"* | *"a sweep"* |
|----------|----------------|-------------|
| a repo that declares 40 keys | true | true |
| a repo that declares **one** key | **false to any reader** | true |

the one-key repo is the tell. it takes the identical code path, refuses a reach identically, and
enumerates reaches identically — so the word for that path must hold at N=1. `bulk` does not.

⚠️ **and this dispute cost no rename**, which is why it was settled rather than deferred:
`bulk` appears **only** in comments, doc headers, and test names — never in a dobj/dop name, never
in an input/output field, never on a published cli or sdk surface. `rule.forbid.domain-term-synonyms`
forbids a synonym **in a contract** and expressly permits one in a comment that describes the
concept from an alternate perspective. so every extant `bulk` is legal where it sits, and the
canonical word governs from here.

## .why not `batch`

a batch implies members **grouped by the caller** for efficiency of execution. a sweep's members are
derived from a scope. that inversion is the whole reason a reach cannot ride one: there is no
caller-named key for the reach to attach to. `batch` would quietly assert the opposite.

## .evidence

**the declared dop.** `getAllKeyrackSweepTargetsForEnv` — the word composes a domain operation this
repo declares, which is what `rule.require.domain-term-itemization` counts. it also reaches the
**published cli surface** twice: the `--json` help line (*"a bare sweep sources reachless keys
only"*) and the refusal message (*"not for every key in a sweep"*), the latter snapshot-locked at
`blackbox/cli/__snapshots__/keyrack.session.acceptance.test.ts.snap`.

**scenario timeline — why the shape, not the size, is the concept**

```
given  a repo whose keyrack.yml declares exactly ONE key
when   a human runs `keyrack get --for repo --reach beav@ehmpathy.com`
then   assertKeyrackReachRequiresKey REFUSES — keyed is false
and    the refusal reads "not for every key in a sweep"
and    it is correct, though "every key" is one key
```

had the word been `bulk`, that refusal would read *"not for every key in a bulk"* over a set of
size one — a message that argues against itself at the moment a human most needs it.

**the term earned its file by a defect, as `keyed` did.** at i065 the `get` guard answered
`--for repo --key K --reach X` with *"name the key"* — a fix the human had already applied. the
repair required the sweep to be **named** in the hint (*"drop `--for repo`"*), which is what forced
the word onto a published surface as a **verb** and made its itemization owed.

## .disputes

### dispute: `bulk` — raised 2026-08-08 — status: RESOLVED (keep `sweep`)

- raised.by = self, on the round that put `sweep` into a published hint
- claim = `bulk` is the incumbent and appears in far more places, so it is the de-facto term
- counter = `bulk` names volume and reads false at N=1, where this path is still taken. `sweep`
  names the shape of the ask, which is what every downstream property keys on
- resolution = keep `sweep`; record `bulk` as a forbidden synonym. no rename is owed, since not one
  `bulk` sits in a contract — every occurrence is a comment, a doc header, or a test name

## .invariants

checkable rules a reviewer can hold the term to:

1. **a sweep is defined by the absence of a key selector**, never by cardinality — a one-key repo
   sweep is a sweep
2. **a sweep's members are derived from a scope**, never typed by the caller
3. **a reach can never ride a sweep** — the refusal is `assertKeyrackReachRequiresKey`, one guard,
   one message, every surface (q2)
4. **selector precedence decides, never flag presence** — `--for repo --key K` is a sweep, because
   the repo scope wins downstream (`term=keyed` invariant 5)

## .see also

- `term=keyed._.choice._.md` — the cardinality claim a sweep makes false; its invariant 5 is this
  term's fourth
- `term=reach._.choice._.md` — the axis a sweep cannot carry
- `term=probe._.choice._.md` — a probe walks addresses for ONE key; a sweep walks keys for one scope
- `rule.forbid.domain-term-synonyms` (learner) — why `bulk` may stay in the comments it sits in
