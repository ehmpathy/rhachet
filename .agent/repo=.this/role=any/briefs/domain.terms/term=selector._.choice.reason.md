# domain.term.choice.reason: selector

## .etymology

`selector` names what the value **does to one identity**: it picks which of several possible
segments the named key carries. the word carries its own arity — you select *from among* options
for a single slot, never *across* a set — which is exactly the distinction that separates it from
`filter`.

| word | why forbidden |
|---|---|
| `filter` | ⚠️ RESERVED. it correctly names the **other** arity: a value that narrows a swept set. to spend it here would collapse the two arities into one word and lose the opposite-expansion rule — see `term=filter._.choice._.md` |
| `scope` | already the **verb's** property; and a keyed ask has no scope to speak of — it names one key |
| `override` | implies a default it displaces. an omitted `--org` is not a default the flag displaces; it is a segment the manifest supplies |
| `qualifier` | grammar jargon; no domain expert says it, and it does not say WHICH slot is qualified |

## .disputes

### dispute: filter — raised 2026-08-25 — status: RESOLVED (both words kept, on different arities)

the full argument is recorded once, at `term=filter._.choice.reason.md`. the resolution: keep
both. `filter` on a sweep, `selector` on a keyed ask.

this file is the second half of that resolution — the `selector` cluster the dispute reserved.

## .evidence

### the opposite expansions are the whole reason the word exists

the two arities do not merely differ; they need **contrary** expansions of the same sigil:

| arity | `@this` expands to | consumer | why |
|---|---|---|---|
| filter | the LITERAL org | compared against host slugs | a host slug carries a literal segment, so a sigil would match zero |
| selector | ABSENT | handed to the manifest-backed lookup | the lookup ALREADY holds the manifest; a literal would be re-derived, then re-checked against itself |

a word that covered both would have to pick one, and either pick breaks the other verb.

### 🔴 the term was coined because a call site forgot the rule

`get` expanded the sigil inline (a bare ternary at its call site); `source`'s keyed path handed
`opts.org` straight through, unexpanded. the lookup's mismatch guard
(`getOneKeyrackGrantByKey.ts:58`) compares the flag against the manifest org and throws:

```
ConstraintError: org '@this' does not match manifest org 'testorg'
```

— for the **one value that names that very manifest**. so `get --org @this` served a repo key and
`source --org @this` refused it, with a message that reads as a genuine mismatch.

⚠️ the shape is the one this whole execution met again and again: **a rule that lived in a call
site instead of in a name.** `get` remembered it; `source` did not. the fix was not a second copy
of the ternary but a NAMED cast both verbs route through — which is what forced the word to exist.

### the sigil match must be EXACT, never a prefix

a prefix match swallows `@thisorg` — a legitimate literal org — and expands it to ABSENT, which
silently serves whatever the manifest holds instead. the clamp carries `@thisorg` as a row for
exactly this reason. the same asymmetry the machine-wide predicate has holds here: an understated
expansion costs a redundant lookup; an overstated one disables a guard.

## .see also

- `term=filter._.choice._.md` — the other arity of the same flag, and where the dispute is recorded
- `term=sweep._.choice.example=org-filter-vs-selector.md` — the one place the shared sense is recorded
- `term=keyed._.choice._.md` — the arity on which the flag is a selector
- `rule.require.named-transformers` (mechanic) — why the rule got a name rather than a third copy
