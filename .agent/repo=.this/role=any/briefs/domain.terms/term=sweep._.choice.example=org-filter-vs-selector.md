# domain.term.choice.example: sweep — a flag FILTERS a sweep, and SELECTS a singular ask

## .the example

keyrack verbs come in two arities, and the same flag serves both without a change of sense:

| flag | on a **singular** verb (`get --key FOO`) | on a **sweep** verb (`unlock --env camp`) |
|---|---|---|
| `--env` | **selects** the slug's env segment | **filters** the swept set to that env |
| `--org` | **selects** the slug's org segment | **filters** the swept set to that provenance |

`--org` names one concept throughout — **provenance**, whose namespace declared the key
(`invokeKeyrack.ts:465-467`). what differs is the verb's **arity**: a singular ask names exactly
one slug, so a flag pins a segment of it; a sweep names a set, so the same flag narrows the set.

⇒ **one term, one sense, two arities.** this is not the overload
`rule.forbid.term.addition.ambiguous` forbids — the word's sense is constant, and only the
cardinality of what it applies to changes.

## 🔴 .a verb may hold BOTH arities — then it must pick exactly one per invocation

`source` is singular with `--key` and a sweep without it. so its arity is decided by the ask, not
by the verb, and the flag must be consumed **once** — on whichever arity that invocation is.

to apply both is the trap, because on a keyed ask the two **disagree by design**: a full slug
outranks the flag there (`getOneKeyrackGrantByKey.ts:45-50` returns the slug verbatim, so
`--org @all` beside `testorg.test.REPO_KEY` still resolves the repo slug — the strict union).
run a sweep filter over that result and it is excluded for its own org segment.

| ask | the selector yields | a filter run over it | what the human sees |
|---|---|---|---|
| `source --key testorg.test.REPO_KEY --org @all` | `testorg.test.REPO_KEY` ✅ | excluded — org is `testorg`, not `@all` | **empty export, exit 0, no message** |

⚠️ the failure mode is the one this whole glossary entry guards: **not a throw, a silent wrong
answer.** the ask was honored, then quietly undone one layer later. ⇒ **gate the filter to the
sweep path**, and clamp the keyed ask so the gate cannot reopen.

**the generalization.** when a flag carries one sense across two arities, the hazard is never the
sense — it is a code path that applies it under both. one flag, one consumption site per ask.

## .why it is worth a record

it decides a **default**, and the wrong default is a silent regression.

when a sweep verb gains a flag it previously lacked, the obvious default is the one the singular
verb uses (`--org` defaults to `@this` on `get`). on a sweep that is **wrong**:

- `unlock`'s default scope is a **union** — repo keys ∪ machine-wide keys
  (`unlockKeyrackKeys.ts:178-187`, clamped at `unlockKeyrackKeys.test.ts:257`, `:295`)
- an `@this` default would drop every machine-wide key from the swept set, **with no error** —
  the keys simply stop to appear

⇒ **a filter's default is "no filter" — the verb's extant scope.** a new flag must ADD reach; a
new flag whose default narrows extant behavior is a regression in a fix's clothes.

## .the shape

| ask | scope |
|---|---|
| `unlock --env camp` (bare) | repo ∪ machine-wide — **the default, unchanged** |
| `unlock --env camp --org @all` | machine-wide only |
| `unlock --env camp --org @this` | repo only |

## .the migration lesson — add the filter first, swap the default later

the additive shape is not merely the safe call; it is the one that keeps the other call
**reachable**. once the explicit filter exists, a later swap of the default (union → `@this`) is
a one-line change to a default — the machinery, the values, and the clamps are already there.

⇒ **sequence a default change as two steps, never one:**

1. **add the explicit filter, default = the extant scope.** unobservable to every caller who
   does not pass it, so it cannot regress
2. **swap the default, if ever wanted.** now a visible, deliberate, separately-clamped change,
   reviewed on its own merits

to do both at once hides a behavior change inside a feature addition — the reviewer sees a new
flag and reads it as purely additive. `rule.require.safe-by-default`, applied to the migration
rather than only to the contract.

⚠️ **the clamp that proves step 1 is the one easiest to skip**: assert the **bare** ask is
byte-identical after the flag lands. a clamp that exercises only the new flag proves the feature
and says no word about the regression.

## 🔴 .the mis-frame this distinction retires

without the arity distinction, a sweep's **result** gets read as the ask's **identity**. the
concrete trap: a keyless `unlock --env camp` expands to a set that includes `@all.{env}.*` slugs,
which invites the read *"here is a third form of machine-wide ask, and it defeats the predicate"*.

**it is not one.** the caller named an env and no org at all. the result set holds machine-wide
keys because a sweep's scope is a union — never because the ask named `@all`.

| the question | a bare `unlock --env camp` |
|---|---|
| does the ask **name** `@all`? | **no** |
| does the result **contain** `@all` keys? | yes — the sweep is a union |

⇒ **a sweep's scope is a property of the VERB; the ask's org is a property of the CALLER.** to
read one off the other is the category error.

**why it is expensive rather than pedantic.** the mis-frame flips a correct answer into a
defect:

| under the mis-frame | correctly framed |
|---|---|
| an org predicate is **deficient** — blind to a third form | the predicate is **complete** |
| a bare sweep is an unhandled case, a latent trap | a bare sweep correctly yields `false` |
| listed as a con; an open question; scope inflated | a correct-by-construction property |

the behavior is identical either way. what changes is whether a reader treats it as a **gap to
close** or a **guarantee to keep** — and a phantom gap draws real work toward it.

## .see also

- `define.keyrack-verb-machine-wide-support.md` — the per-verb inventory this rule serves
- `term=filter._.choice._.md` — the sweep-arity word, itemized (and why `selector` is RESERVED)
- `term=ask._.choice._.md` — the noun both arities are arities OF
- `term=machine-wide._.choice._.md` — what `@all` names
- `rule.prefer.symmetric-term-pairs` — why `--org` should mirror `--env` across the arities
