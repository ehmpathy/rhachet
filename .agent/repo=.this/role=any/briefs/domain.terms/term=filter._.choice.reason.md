# domain.term.choice.reason: filter

## .etymology

`filter` names what the value **does to a set**: it lets some members through and holds the rest
back. the word carries its own arity — you filter a set, never a single value — which is exactly
the distinction the domain needed a word for.

| word | why forbidden |
|---|---|
| `selector` | ⚠️ RESERVED. it correctly names the **other** arity: a value that picks one slug segment on a keyed ask — itemized at `term=selector._.choice._.md`. to spend it here would collapse the two arities into one word and lose the opposite-default rule |
| `scope` | already the **verb's** property — `status` has a scope; the flag narrows it. to call the flag a scope overloads one word across the set and the narrower of the set |
| `match` | names the per-member predicate, not the flag a human passes |
| `constraint` | reads as an error condition; a filter that yields an empty set is legitimate, never a failure |
| `narrower` | invented jargon; no domain expert says it |

## .disputes

### dispute: selector — raised 2026-08-25 — status: RESOLVED (both words kept, on different arities)
- raised.by = execution stone, `v2026_08_25.fix-keyrack-all-skips-manifest`
- claim = `--org` is ONE flag with ONE sense (provenance), so it should carry ONE word. two words
  for one flag invite a reader to think there are two flags
- counter = the sense is indeed one — provenance — but the **arity** is two, and the two arities
  need **opposite defaults**. a single word hides that: it is precisely the read that would let a
  later author "unify" the flag and swap `default: no filter` to `default: @this`, which would
  quietly drop every machine-wide key from every sweep. the two words are what make the opposite
  defaults legible
- resolution = keep both. `filter` on a sweep, `selector` on a keyed ask. the shared sense is
  recorded once at `term=sweep._.choice.example=org-filter-vs-selector.md` so neither word can
  drift into a second sense

## .evidence

### the opposite defaults are the whole reason the word exists

`unlock`'s extant scope is a **union** — repo keys ∪ machine-wide keys
(`unlockKeyrackKeys.ts`, clamped in its unit suite). the wish added `--org` to it. had the flag
defaulted the way the keyed verbs default (`@this`), every bare `unlock` would have dropped the
machine-wide half of a set it had always unlocked — a silent regression, in a flag advertised as
additive.

the wisher settled it directly: *"keep union the default but add support for explicit"*, and
*"we can swap union default to this default in the future if we want it"*. a filter is what makes
that future swap a one-line default change reviewed on its own merits, rather than a behavior
change smuggled in with a new flag.

### the `@this` expansion is what proves a filter is not a raw compare

`getOneKeyrackFilterOrg` exists because a filter compared verbatim would make `--org @this` match
zero host slugs and render an empty rack — which reads to a human as *"you have no repo keys"*
rather than *"that flag needs an expansion"*. so a filter is a domain value with a cast, not a
string handed to a `===`.

that cast is also where the machine-wide invariant is held: `@this` is the only value that needs a
repo at all, so the manifest load is confined to its branch. `--org @all` touches no gitroot and no
manifest, on a sweep verb exactly as on a keyed one.

### 🔴 the defect the two words make legible

`source` holds BOTH arities — singular with `--key`, a sweep without it. a narrow placed **below**
the key/sweep branch lets one invocation consume the flag under both words at once:
`getOneKeyrackGrantByKey` takes it as a **selector** and reaches `testorg.test.REPO_KEY`
correctly, then the **filter** excludes that very slug for its org segment. an empty export, exit
0, no message.

⚠️ that defect is legible only through the two-word split. under one word it reads as "the flag is
applied once, at the end" — which is the sentence a reviewer nods at. ⇒ **one flag, one
consumption site per ask**, and the filter is gated to the sweep path.

⇒ the two words are what make that defect **expressible**. one word cannot state it: "the filter
excluded the slug the selector reached" collapses to "the flag excluded the slug the flag
reached", which reads as a contradiction rather than as a fault at a known site.

## .see also

- `term=sweep._.choice.example=org-filter-vs-selector.md` — the one place the shared sense is recorded
- `term=keyed._.choice._.md` — the arity on which the same flag is a selector
- `term=machine-wide._.choice._.md` — the provenance class `--org @all` filters to
- `rule.prefer.defaults-match-common-case` (ergonomist) — why an absent filter must mean the extant scope
