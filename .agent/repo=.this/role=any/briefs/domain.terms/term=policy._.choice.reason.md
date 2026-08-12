# domain.term.choice.reason: policy

## .etymology

greek *politeia* → latin *politia* → old french *policie*: **the settled way a body governs
itself.** three senses of the english word survive, and this repo takes the third:

| sense | example | ours? |
|-------|---------|-------|
| a document of intent | "the privacy policy" | ❌ prose, not data |
| an insurance contract | "a life policy" | ❌ unrelated |
| **a settled, declared rule a system applies uniformly** | "iam policy", "retry policy", "cache policy" | ✅ **this one** |

the third sense is already the industry default for exactly this shape — an exhaustive,
machine-read declaration that binds behavior at a decision point (`aws iam policy`,
`kubernetes network policy`, `cache eviction policy`). a reader who meets
`KEYRACK_VAULT_REACH_POLICY` needs no gloss, which is `def.domain-discovery`'s own test.

## .evidence — dimensional decomposition

the term is not invented; it fell out of a walk of the product of two orthogonal axes.

**the axes:** `{ mech, vault } × { each union member } × { how it treats a reach }`

| axis | union | the question its policy answers |
|------|-------|----------------------------------|
| **mech** | `KeyrackGrantMechanism` | does a reach change what this credential OPENS? |
| **vault** | `KeyrackHostVault` | can this storage tell two reaches APART once filed? |

the two are genuinely separate and neither subsumes the other. a mech decides what a credential
**opens**; a vault decides whether two reaches can be **told apart** once filed. a sweep of
the mech table proves no claim at all about `os.direct`.

**the cells, and the forbidden combination that proves the decomposition is real:**

```
              mech policy        vault policy
os.envvar     (n/a)              UNADDRESSABLE
aws.config    REFUSED            VIA_MECH        ← the cell that forced the third value
os.secure     (varies)           ADDRESSED
```

`aws.config` is the cell no two-valued vocabulary can hold. its address **could** carry a
reach, yet it must still refuse — because its mech mints against an sso profile, which is
its own reach axis. the vault has no policy of its own; it **defers**. that is why
`VIA_MECH` exists, and why any boolean word (`support`, `capability`) was rejected: a boolean
cannot express a delegation.

## .disputes

### dispute: posture — raised 2026-08-06 — status: RESOLVED (keep `policy`)
- raised.by = self (a drift caught in my own prose, never in a contract)
- claim = i wrote *"each vault's posture declared as data"* and *"flipped `os.direct`'s
  posture"* across four rounds of yield prose. the word reads natural and describes the same
  fact
- counter = three grounds, weakest first:
  1. **it is already spent.** `KeyrackKeyGrade.ts:2` documents itself as *"security **posture**
     of a credential"* — a different concept (protection + duration, derived by `inferKeyGrade`).
     one word, two senses = `rule.forbid.domain-term-synonyms`
  2. **it names the wrong half of the fact.** a posture is a stance an adapter *holds* — an
     observed property, read off behavior. the whole design point is the reverse: the table is
     **declared first** and the guards read it, so behavior conforms to the word rather than the
     word reporting on behavior. `assertKeyrackReachAddressable` throws when an adapter disagrees
     with the table, which is unthinkable if the table merely *reported* postures
  3. **it does not carry the invariant.** "policy" implies an authority that binds; "posture"
     implies a report that could be wrong without consequence
- resolution = keep `policy` in every contract; record `posture` as a forbidden synonym.
  ⚠️ **its four appearances in `KeyrackVaultReachPolicy.ts` comments stay** —
  `rule.forbid.domain-term-synonyms` explicitly permits a synonym in a comment, where it
  frames the concept from an alternate perspective. verified 2026-08-06:
  `grep -rn 'posture' src` yields four hits, **all in comments, none in a contract**

### dispute: one table, or two? — raised 2026-08-06 — status: RESOLVED (two)
- claim = `KeyrackMechReachPolicy` and `KeyrackVaultReachPolicy` share a shape; one table with a
  wider value union would be drier
- counter = they key on **different unions** with **disjoint value sets**, and the axes are
  orthogonal by construction — `aws.config` is `REFUSED` on one and `VIA_MECH` on the other, in
  the same breath. a merge would need a discriminant per row, which is the two tables again with
  extra ceremony
- resolution = two tables, one term. the *word* is shared; the *data* is not

### dispute: extract a shared `assertReachPolicyConformance()`? — status: OPEN, deferred
- claim = the two conformance test files walk the same shape (r011 @ i055)
- counter = `rule.prefer.wet-over-dry` — two instances is where you notice a pattern, three is
  where you extract it. r011 named the condition itself: *"if a third reach-policy axis is ever
  added."* and the two are less alike than they look: the mech sweep drives real adapters for
  its REFUSED half, while the vault sweep needs a per-adapter probe (`get` where present, `del`
  where write-only) the mech axis has no analogue for
- resolution = deferred until a third axis exists. the condition is recorded so the next
  traveler need not re-derive it

## .invariants

checkable rules a reviewer can hold the term to:

1. **exhaustive by type** — every policy is a `Record<Union, …>`, so an absent member is a build
   failure. a `Partial<>` or a lookup with a default would silently answer for a member that
   never declared
2. **the table is the authority** — a guard READS its policy; it never restates one. a
   hard-coded list of members inside a guard is the defect this term exists to prevent
3. **truth is test-enforced** — coverage is the compiler's job, truth is a conformance sweep's.
   a policy with no sweep is prose with a type annotation
4. **a mis-wire is an `UnexpectedCodePathError`** — never a `ConstraintError`. the caller is at
   no fault; a wrong guard is a wire defect

## .see also

- `term=mech._.choice._.md` — the axis one policy keys on
- `term=address._.choice._.md` — what `ADDRESSED` / `UNADDRESSABLE` are a policy *about*
- `term=grade._.choice._.md` — the concept `posture` is already spent on
- `term=assert._.choice._.md` — the verb of the guards that read a policy
