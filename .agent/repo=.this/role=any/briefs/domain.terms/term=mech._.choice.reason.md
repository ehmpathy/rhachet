# domain.term.choice.reason: mech

## .etymology

`mech` is the clipped form of **mechanism** — the machinery by which a thing is done. keyrack
splits a key's identity across four independent axes, and `mech` owns exactly one of them:

| axis | question it answers | term |
|------|--------------------|------|
| storage | *where does the value live?* | `vault` |
| provenance | *whose manifest declared it?* | `org` |
| destination | *which reach does it open?* | `reach` |
| **machinery** | ***how does it come to exist?*** | **`mech`** |

the word was chosen because the enum values already read as a sentence with it:
`mech = EPHEMERAL_VIA_GITHUB_APP` reads *"the mechanism is: ephemeral, via the github app."* the
`_VIA_` in every value is the tell — a mech names a **route to a credential**, and `via` is the
preposition that route takes.

⚠️ the word **predates** this round in the codebase; what this round did was promote it from an
incidental field to a **required** one on a published contract. see the dispute below.

## .disputes

### dispute: `mechanism` (as the field form) — raised 2026-08-04 — status: RESOLVED (keep both, split by position)

- raised.by = the learner sweep, on noticing the type says `Mechanism` and the field says `mech`
- claim = one concept must have one word (`rule.forbid.domain-term-synonyms`); a type that spells
  `Mechanism` beside a field that spells `mech` looks like precisely the drift the rule forbids,
  and a later traveler could "fix" it in either direction
- counter = they are one **word** at two **lengths**, not two words — the relationship `id` has
  to `identifier`. the rule's target is a second *lexeme* (`method`, `strategy`, `provider`),
  which genuinely splits a concept in a reader's head. a clipped form does not: no reader meets
  `mech: KeyrackGrantMechanism` and wonders whether two things are meant, because the annotation
  spells the word out one token away.
  the split also earns its keep: `rule.require.order.noun_adj` wants a family under one
  autocomplete prefix, and `mechAdapter*` delivers that at every adapter file and call site.
- resolution = keep both, **bound by position**: `Mechanism` in type and class names, `mech` in
  fields, variables, and file-name prefixes. record `mechanism` as forbidden *at the field
  position only* — it is the canonical form at the type position, so a blanket forbid would be
  wrong. dispute closed.

### dispute: `scheme` — raised 2026-08-03 — status: RESOLVED (forbidden, and the reason is historical)

- raised.by = the reach amendment
- claim = none — this dispute runs the other way. `scheme` was never proposed *for* mech; it is
  recorded as forbidden so it cannot drift *into* the slot later
- counter = `scheme` was a live word in this domain until 2026-08-03. a reach was a uri
  (`github://org=$org`) with a parsed `scheme`, and `KEYRACK_KEY_REACH_SCHEMES` was a closed set.
  the wisher's correction deleted it: *"no url. no schemes. none of that."* the word is now
  **retired from the domain**, and a retired word is exactly the kind that gets re-adopted by a
  traveler who never saw why it left
- resolution = `scheme` is forbidden across the whole keyrack domain, not merely as a mech
  synonym. **the one surviving use is mech-local and deliberate**: `asGithubOrgFromReach` parses
  the `github://org=` convention inside the github-app mech, because that mech alone must read a
  reach as an org. that convention lives in the mech, never in the domain. dispute closed.

## .evidence

### the axis is orthogonal to the other three, provably

the registry aliases prove `mech` is not derivable from any other axis — **one adapter serves
several mechs**:

```ts
// genContextKeyrackGrantGet.ts
PERMANENT_VIA_REPLICA:     mechAdapterReplica,
PERMANENT_VIA_REFERENCE:   mechAdapterReplica,   // ← alias
EPHEMERAL_VIA_SESSION:     mechAdapterReplica,   // ← alias
EPHEMERAL_VIA_AWS_SSO:     mechAdapterAwsSso,
EPHEMERAL_VIA_GITHUB_OIDC: mechAdapterAwsSso,    // ← alias
```

**adapter↔mech is 1:many.** so the mech is a fact about the *key*, never a fact recoverable from
the *adapter* that serves it. that is why the word must exist as its own field and cannot be
inferred.

### the invariant this round added, and what it cost to learn

`v2026_07_31.feat-keyrack-unlock-scope` (i011) made `mech` a **required** input to
`KeyrackGrantMechanismAdapter.acquireForSet`. the defect that forced it:

`mechAdapterAwsSso` hardcoded `mech: 'EPHEMERAL_VIA_AWS_SSO'` into its refusal, while serving
`EPHEMERAL_VIA_GITHUB_OIDC` as well — so an oidc key **refused correctly and explained wrongly**,
and a human sent to debug an oidc credential was told the fault lay in aws sso.

**required, not optional, and the distinction is the whole fix.** an optional `mech` is a
droppable `mech`: an adapter would need a fallback, the fallback would be a literal, and the
literal would be the same defect one `??` away. required made the compiler enumerate every call
site — exactly 5, one per vault — and each already held `mech` in scope.

⚠️ **the clamp for it had to be written at the adapter, not the guard.** a first attempt clamped
`assertKeyrackReachAbsent` and passed **with the defect restored** (27/27 green): the guard was
never broken — it faithfully reports whatever mech it is handed. only an assertion on *which*
mech the error names, made against the **adapter**, can see the defect at all. recorded here
because it generalizes: **clamp at the grain where the defect lives, never at the grain where the
guarantee is stated.**

### the tri-modal contract this term now carries

`mech` is what decides how a `reach` is treated, which is why its accuracy became load-bearing:

| kind | mech | what a reach does |
|------|------|-------------------|
| **derived** | `EPHEMERAL_VIA_GITHUB_APP` | parses the label as an org; mints for that installation |
| **declared** | `PERMANENT_VIA_REPLICA` | carries the label through untouched; files the value under it |
| **refused** | `EPHEMERAL_VIA_AWS_SSO` | throws — an sso profile is its own reach axis |

## .see also
- `term=reach._.choice._.md` — the destination axis `mech` decides how to treat
- `term=grade._.choice._.md` — `{protection, duration}`, derived partly *from* the mech
- `rule.require.order.noun_adj` — why the short form wins at the field position
