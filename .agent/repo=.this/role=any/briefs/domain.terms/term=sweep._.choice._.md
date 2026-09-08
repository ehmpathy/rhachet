# domain.term: sweep

term.chosen   = sweep
term.kind     = noun
term.synonyms.forbidden:
- bulk
- batch
- blanket
- scan
- crawl

## .what

an ask that names **no single key**, so its members are derived from a **scope** — a repo manifest,
an env — rather than typed by the caller.

a sweep is defined by the **absence of a key selector**, never by how many keys come back. a repo
that declares one key still yields a sweep: it takes the sweep code path, refuses a reach, and
enumerates declared reaches.

```
--key K      → a keyed ask  → one key, and a reach is nameable beside it
--for repo   → a sweep      → every key the repo manifest declares
--env all    → a sweep      → every key across every env
```

## .the axis a sweep cannot carry

a **reach** is an identity axis of exactly ONE key, so it can never ride a sweep — a sweep's
members were never named by the caller, so there is no one key for the reach to qualify. that
refusal is
`assertKeyrackReachRequiresKey`, stated the same way on every surface (q2).

⚠️ **`--for repo --key K` is a sweep.** the repo scope wins downstream and the key is never read, so
the cardinality follows the selector the router honors, never the flag that was typed. see
`term=keyed._.choice.reason.md` invariant 5.

## .refs
- `src/domain.operations/keyrack/getAllKeyrackSweepTargetsForEnv.ts`  # the declared dop
- `src/domain.operations/keyrack/reach/assertKeyrackReachRequiresKey.ts`    # the guard that refuses a reach on one
- `src/contract/cli/invokeKeyrack.ts`                                 # `--for repo`, and the help line that names a bare sweep
- `src/contract/sdk.keyrack.ts`                                       # the sdk note that states the same rule

## .on the verb form

`sweeps` in predicate position names the same one concept — *"`--for repo` sweeps every key in the
repo"* is legal, and it is what the i065 hint says. the **noun** is canonical because that is the
form the declared dop carries (`SweepTargets`); the verb is the same word in a sentence, never a
second sense.

## .why not `bulk`

`bulk` names **volume** — how much. `sweep` names **shape** — one pass over a scope. the difference
carries weight: a repo that declares ONE key still takes this path, and to call that a "bulk ask"
reads false to the human who typed it.

## .the scope is the VERB's; the ask's org is the CALLER's

a corollary of *"members are derived from a scope"*: **a sweep's result set is a property of the
verb, never a statement about what the caller asked for.**

so a flag reads differently by arity, without any change of sense:

| flag | on a **keyed** ask (`get --key FOO`) | on a **sweep** (`unlock --env camp`) |
|---|---|---|
| `--env` | **selects** the slug's env segment | **filters** the swept set |
| `--org` | **selects** the slug's org segment | **filters** the swept set |

⚠️ the trap this closes: a sweep whose scope is a **union** returns members from namespaces the
caller never named. to read those members back as the ask's identity is a category error — see
the worked example.

## .reason
see the ref-level cluster beside this choice:
- `term=sweep._.choice.reason.md` — etymology, the `bulk` dispute, evidence, invariants
- `term=sweep._.choice.example=org-filter-vs-selector.md` — a flag filters a sweep and selects a
  keyed ask; why a filter's default must be the verb's extant scope
