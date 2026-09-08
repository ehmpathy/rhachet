# domain.term.choice.reason: org

## .etymology

`org` is the abbreviated form the domain already speaks. it was not chosen here — it was
**exhumed**: the cli flag is `--org`, the manifest field is `manifest.org`, the slug segment is
segment 1, and the error code is `ORG_MISMATCH`. every one of those predates this behavior. to
have written `organization` would have been to invent a synonym for a word the codebase already
settled.

the nearby vocabulary is github's, where an org is the account that owns repos — so `org` reads
with one sense to any human who has used github, which is every user of this cli.

`organization` is forbidden not because it is wrong but because it is a **second spelled form of
one concept** — the exact synonym drift `rule.forbid.domain-term-synonyms` exists to stop.

## .why the three senses live under ONE term

a fair challenge: `@this`, `@all`, and `ehmpathy` behave so differently that they could be argued
to be three concepts under one word — which would make `org` an **ambiguous overload**
(`rule.forbid.term.addition.ambiguous`).

they are one term, and the test is positional: **all three occupy slug segment 1, and exactly one
of them does.** they are three *values* of one axis, never three axes. the `@` sigil marks the two
non-literal values as sigils rather than org names (`define.address-sigils`), so a reader tells
them apart at a glance without a second word.

what IS genuinely distinct is the **arity** `--org` takes on a keyed ask versus a sweep — and that
distinction is carried by two separate terms, `selector` and `filter`, rather than by an overload
of `org`. see `term=sweep._.choice.example=org-filter-vs-selector.md`.

## .disputes

### dispute: owner — raised 2026-09-06 — status: RESOLVED (keep both, as separate terms)
- raised.by  = beav (this behavior)
- claim      = `--owner` and `--org` both name "whose credential this is", so one is redundant
               and the cli asks a human to hold two words for one idea
- counter    = they are **orthogonal**, and a real case proves it: one box holds `ehmpath`'s
               keyrack AND a human's keyrack, and EACH holds both `ehmpathy.*` and `@all.*`
               slugs. so (owner × org) is a genuine 2-d space. to merge them would make
               `--owner ehmpath --org @all` unspellable — the exact ask the credential-helper
               path depends on
- resolution = keep both. `org` = the namespace a credential is filed under; `owner` = whose
               keyrack is read. each recorded as a forbidden synonym of the other. closed.

### dispute: scope — raised 2026-09-06 — status: RESOLVED (keep `org`)
- raised.by  = beav
- claim      = an org segment IS a scope, so `scope` would name it more generally, and the repo
               already declares that term
- counter    = `scope` is the **genus**, `org` a **species**. a keyrack ask is scoped along at
               least three axes at once — org, env, owner — so to call the first one "scope"
               would leave the other two unnamed and make `--scope` unreadable. a term that names
               the category cannot also name one member of it
- resolution = keep `org`; `scope` stays its own term at its own grain. closed.

## .evidence

**the domain expert's own words** (wisher, 2026-08-25), which fix `@all`'s sense:

> all keyrack verbs serve `--org @all` identically — no repo manifest required, no gitroot
> required.

⇒ so `@all` is not merely a wildcard over orgs; it names **the absence of a repo dimension**. that
is why `org-agnostic` is RESERVED rather than adopted: an org-agnostic key would be one readable
under *any* org, whereas `@all` is filed under *no* org. those would be different keys, and a
future `@any` may yet need that word.

**the codebase corroborates the three-way split at the point of adjudication** —
`asKeyrackKeySlug.ts` branches on exactly these three cases: `@this` resolves from
`manifest.org`, `@all` is exempted from the `ORG_MISMATCH` guard, and a literal org is checked
against the manifest. one function, three arms, one axis.

**a repo manifest can never emit an `@all.*` slug** — `getAllKeyrackSlugsForEnv.ts` derives every
slug it yields from `manifest.org`. so repo-scoped and machine-wide are **disjoint by
construction**, never overlapped sets that happen to differ. that is what makes the three senses
a partition rather than a hierarchy.

## .invariants

- an org segment is exactly one of: a literal org, `@this`, or `@all` — never absent, never two
- `@this` is meaningless without a repo manifest ⇒ any verb given `@this` MUST load one
- `@all` is meaningful without any repo ⇒ no verb given `@all` may REQUIRE a gitroot or manifest
- a repo manifest never yields an `@all.*` slug; the host manifest is the only source of one
- `org` and `owner` cross freely; neither constrains the other
