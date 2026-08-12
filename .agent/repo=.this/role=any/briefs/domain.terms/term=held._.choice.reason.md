# domain.term.choice.reason: held

## .etymology

the rack metaphor again, and it is the same metaphor `unlock` rides. a key you have taken off the
rack is **in your hand** — held. it says where the key IS, and makes no claim about what you did
with it.

that split is the whole point. the extant status words all describe an **event** (an ask, and its
outcome). `held` describes a **state** (this machine carries it). a term that conflates the two
lets a render claim a fetch that never ran.

## .why each rejected synonym fails

| rejected | why |
|----------|-----|
| `active` | reads as "in use right now", which no one knows. the daemon carries keys nobody touches |
| `cached` | implies a copy of a truth that lives elsewhere, and invites the reader to ask when it goes stale. a daemon grant IS the live session credential, not a copy |
| `loaded` | names a mechanism (someone loaded it), which is the HOW `howto.domain-discovery` says to avoid. it also collides with the vault sense of "load a source" |
| `present` | generic english, and true of a manifest entry too — so it cannot tell configured from held |
| `live` | overloads with expiry: a key can be held AND expired within the same second |
| `available` | the most seductive and the most wrong. it promises a *result* ("you can have it"), which is a grant claim, and that is the exact conflation this term exists to prevent |

## .evidence

**a published render value.** `held` appears in `keyrack source` stderr and in the brain-creds
notice — surfaces a human reads. `rule.require.domain-term-itemization` counts a word that composes
a published surface, and a status token IS the surface.

**the defect it prevents, stated as a counterfactual**

```
given  a repo that declares no reaches
and    a human who holds `API_KEY @ vlad@ehmpathy.com` ad hoc
when   `keyrack source` announces the reach it could not carry
then   with `held`:      "API_KEY @ vlad@ehmpathy.com (held)"
                          — true: the daemon listed it, and no fetch was attempted
and    with `granted`:   "API_KEY @ vlad@ehmpathy.com (granted)"
                          — FALSE: it claims a credential was retrieved and verified
and    a human reads the second as "keyrack fetched this and chose not to give it to me",
       which sends them to debug the emit rather than the namespace
```

**clamped**, so the distinction is not a comment: `asKeyrackReachOmittedNotice [case4][t0]` asserts
`(held)` is present AND `(granted)` is absent on the same row. dogfooded — the pair goes red the
moment the ad-hoc list is ignored.

## .invariants

checkable rules a reviewer can hold the term to:

1. **`held` is never a member of `KeyrackGrantAttempt.status`** — that set is closed to outcomes of
   an ask, and `held` is an observation. to add it would let a fetchless row masquerade as a fetch
2. **`held` may only be reported for a row sourced from `daemonAccessStatus`** — the one call that
   observes without a request
3. **a row with a real attempt status renders THAT status, never `held`** — a declared reach was
   genuinely asked for, so to flatten it to `held` would discard the answer it earned
4. **`held` makes no claim about expiry** — a held key may be seconds from death; ttl is a separate
   field and a separate fact

## .see also

- `term=adhoc._.choice._.md` — the only kind of row that reports `held` today
- `term=unlock._.choice._.md` — the act that puts a key in the daemon's hand
- `term=probe._.choice._.md` — the other place this repo distinguishes an observation from a result
- `rule.forbid.domain-term-ambiguity` (learner) — the rule the `available` rejection serves
