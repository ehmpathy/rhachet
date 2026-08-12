# domain.term.choice.reason: keyed

## .etymology

old english *cǣg* — that which opens one lock. the `-ed` suffix makes it a **past participle used
as an adjective**: not "a key exists somewhere nearby", but "this ask **has been given** its one
key", the way *addressed* means an envelope carries its one address.

that participle grammar is the whole argument for the word, and it is also where the drift came
from: english lets a participle adjective slide from *"has been given exactly one"* toward
*"has some relation to"*. `keyed` held the first sense in the contract and the second in three of
its call sites.

## .evidence — the term earned its file by a defect it caused

this is not a term discovered in the abstract. it was settled **because a wrong read shipped**.

`assertKeyrackReachRequiresKey` takes `keyed: boolean` rather than the selector itself, and its own
note says why:

> *".note = `keyed` is a boolean rather than the selector itself, deliberately: the four callers
> hold the selector in four shapes (`key?: string`, `slugs?: string[]`, a repo-wide flag). to
> accept each shape here would drag their differences into the one place that exists to hold what
> they share."*

that design is right — but it moves the **derivation** to each caller, and a derivation is exactly
where a word's sense can drift unobserved. it did:

```ts
// getKeyrackKeyGrants, before 2026-08-06 — reads "not a repo"
keyed: !selector.repo,
```

for `for: { keys: ['A','B','C'] }` this yields `true`, so the guard passed, and the loop below
threaded one `reach` into all three keys. the assert's own message forbids exactly that
(*"meaningful for one key — not for every key in a sweep"*), so the contract and its caller
disagreed about the word while both compiled.

found by a peer review (r011 @ i058), which graded it a **documentation gap** on the grounds that
no live caller pairs a reach with a multi-key selector. that grade rests on behavior, which decays.
the durable fact — verified, not assumed — is stronger:

```
grep getKeyrackKeyGrants src/contract   →   4 hits, all in sdk.keyrack.ts, none an export
```

the operation is **off the published surface**, so every caller is ours. that is what makes the
strict form cheap now and expensive later, and it is why the fix was taken rather than deferred.

clamped by `getKeyrackKeyGrants.reach.test.ts`, 4 cases. dogfood: reverted to `!selector.repo` →
`2 passed, 2 failed`, red at both multi-key assertions and green at the repo-sweep and reachless
cases — so the clamp fires on the moved branch and on no other.

## .disputes

### dispute: should the word be renamed? — raised 2026-08-06 — status: OPEN

- raised.by = self, on the round that fixed the drift
- claim = `keyed` still reads two ways at a glance. english offers no signal that the participle
  means *exactly one*, so a future traveler who adds a sixth call site may derive it as
  "a key is involved" — the same slip, in a new place. a name that carries the cardinality
  (`keyedToOne`, or a `count`/`cardinality` field the assert compares itself) could not drift,
  because the contract would state the number rather than trust each caller to mean it
- counter = three:
  1. the word is **in the contract at five call sites**, and a rename is a refactor of a shared
     guard across two layers — a wisher's call, not a driver's
  2. the drift is now **clamped where it bit**, and the invariant is written down (this cluster),
     so the next traveler has a checkable rule rather than a vibe
  3. `keyed` is genuinely the domain's word for the concept — a locksmith says a lock is *keyed to*
     one key. the ambiguity is english's, not the domain's
- resolution = **OPEN.** kept as `keyed` for now, with the cardinality invariant recorded above.
  flagged for the wisher beside the other structural items. ⚠️ this is a term whose weakness is
  known and accepted, not one whose weakness went unnoticed — which is the difference this file buys

### dispute: is `opts.for !== 'repo'` a live instance of the same slip? — raised 2026-08-06 — status: RESOLVED (imprecise, not unsafe)

- claim = `invokeKeyrack.ts` (`get`) computes `keyed: opts.for !== 'repo'` — the forbidden
  negation shape. a `keyrack get --reach X` with neither `--for repo` nor `--key` yields
  `undefined !== 'repo'` → `true`, so the reach guard passes on an ask that names no key at all
- counter = verified at `invokeKeyrack.ts:511`: a downstream usage guard catches
  `!opts.for && !opts.key` and emits a named fix —
  *"must specify --for repo or --key <slug>"* with a copy-pasteable hint. and commander declares
  `--key <name>` as a single value, so no multi-key ask can reach this site
- resolution = the human always gets a correct, actionable error; only its **precision** is lost
  (a usage error rather than a reach error). recorded as a known imprecision rather than fixed,
  since a code change here would ride no review budget and buy no safety. ⚠️ it becomes a real
  defect the moment `--key` is made repeatable — that is the trigger to revisit

### ⚠️ addendum 2026-08-08 — the negation is safe BY ACCIDENT, and the obvious fix is a hole

re-traced the whole derivation and found the resolution above is right for a reason it did not
state. **do not "clean up" `opts.for !== 'repo'` into `!!opts.key`.** that reads like the
invariant-2 fix and it opens the exact hazard the guard exists to close:

`invokeKeyrack.ts` routes on `if (opts.for === 'repo')`, which asks `for: { repo: true }` and reads
**neither** `--key` nor `--reach`. so `--for repo` **wins**. under `!!opts.key`, the ask
`get --for repo --key K --reach X` would pass the guard and then fall into the sweep with the reach
silently dropped — a reach that rides a whole-repo sweep, which is the one condition
`assertKeyrackReachRequiresKey` was written to refuse.

so `keyed: false` is **semantically correct** for that ask: it truly does not narrow to one key.

**what WAS wrong there was the hint, and it is now fixed.** the guard answered a human whose command
line already held `--key API_KEY` with *"name the key"* — a fix they had already applied, the
walk-a-human-down-a-road-that-cannot-work shape `rule.require.errors-name-the-fix` forbids. the hint
is now conditioned on `opts.key` and names **`drop --for repo`**, with their own key echoed rather
than a `$KEY` placeholder.

⚠️ this is the **same defect shape** the collision guard's axis precedence fixed on 2026-08-07 (see
`term=collision._.choice.reason.md`): a hint is only a fix if it names the axis that actually
separates the two. one rule, caught twice in one feature, on two different guards — which is the
argument for the rule, not against it.

clamped at `blackbox/cli/keyrack.session.acceptance.test.ts [case4][t2]`, whose twin `[t1]` (no
`--key`, so *"name the key"* IS the fix) must stay still. dogfood: hint made unconditional →
**40 passed / 4 failed**, red at all three content assertions and the snapshot, and `[t1]` green
throughout — so the clamp fires on the moved branch and on no other.

- **added invariant 5**: a `keyed` derivation must account for **selector precedence**, never for
  flag presence alone. where two selectors can be given at once, the one the router honors decides
  the cardinality

## .invariants

checkable rules a reviewer can hold the term to:

1. **`keyed` is a cardinality claim** — it asserts *exactly one*, never *at least one*
2. **never derived by negation** — `!repo`, `for !== 'repo'` are forbidden derivations; they say
   what an ask is not
3. **a plural selector must count** — `keys.length === 1`, never `keys.length > 0`, never truthiness
4. **a singular selector may use truthiness** — `!!input.key` is legal only where the field itself
   forbids a second key
5. **selector precedence outranks flag presence** — where two selectors may be given at once, the
   one the router honors decides the cardinality. `--for repo` + `--key K` is `keyed: false`,
   because the repo sweep wins downstream and the key is never read (addendum 2026-08-08)

## .see also

- `term=reach._.choice._.md` — the axis whose one-key nature makes this precondition necessary
- `term=assert._.choice._.md` — the verb this term's guard is named with
- `rule.forbid.domain-term-ambiguity` (learner) — the rule this term was caught by
- `rule.forbid.ambiguous-labels` (ergonomist) — one word, one sense, on every surface
