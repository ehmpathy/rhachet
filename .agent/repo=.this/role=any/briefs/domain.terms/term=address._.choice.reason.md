# domain.term.choice.reason: address

## .etymology

the keyrack domain is built on one metaphor, and the whole vocabulary hangs off it: **a rack of
keys, one key per lock.** the vision states it as *"you do not scope a key down. you cut a key
per lock"*, with the analogy of car keys — the tacoma key and the scout key share a name, an
owner, and a hook by the door, and are still two keys.

`address` is the word that metaphor demands for **which hook a key hangs on**. it is the physical
noun in a domain of physical nouns (`rack`, `key`, `vault`, `lock`), and it carries the property
that matters: an address is a **destination you construct and hand to someone**, not a structure
you take apart.

the postal sense is exactly right, its awkward half most of all: a street address is written to
be *delivered to*, not *parsed*. `1600 Pennsylvania Ave` splits cleanly enough by convention, but
`O'Brien-Smith, Apt 4@Rear` does not — and no postal worker tries. the keyrack address inherits
that: it is compared whole, never decomposed.

## .disputes

### dispute: `slug` (for the composite form) — raised 2026-08-03 — status: RESOLVED (keep `address` for the composite)

- raised.by = the i009 implementation, which found the two coincide for every reachless key
- claim = the two forms are the same string in the common case, so one word would serve. every
  extant caller already says `slug`, and a second noun is a second concept for a reader to hold
- counter = they carry **opposite parse contracts**, and to merge them would legalize the one
  operation that is unsound. `slug` is *made to be split* — `asKeyrackKeyOrg`, `asKeyrackKeyEnv`,
  and `asKeyrackKeyName` each take a slug apart, and the whole read filter depends on the org
  segment. an address **cannot** be split, because a reach exid may legally hold `@` (an email
  is the obvious name for a claude account, and the wisher's own example is
  `beav@ehmpathy.com`). one word for both would put a reader one keystroke from
  `address.split('@')[0]`, which is wrong whenever the exid holds an `@`
- resolution = keep both. `slug` stays the parseable three-segment name; `address` names the
  construct-only composite. record `slug` as forbidden **for the composite form only** — it
  remains the canonical word for the three-segment name, so a blanket forbid would be wrong.
  dispute closed.

### dispute: `partition key` — raised 2026-08-03 — status: RESOLVED (forbidden in contracts, allowed in comments)

- raised.by = the vision, which used "partition key" throughout its q3 discussion
- claim = "partition key" is precise and already in the design vocabulary; the daemon store
  genuinely does partition by it
- counter = it names the **structure that holds the value**, not the domain fact. the same
  identifier keys three different structures — an in-memory `Map` (the daemon), a `Record` in an
  encrypted file (the host manifest), and a hash input (`getCredentialPath`) — so a word borrowed
  from any one of them is wrong at the other two. the domain fact is *where the key hangs on the
  rack*, which is true regardless of which structure is asked
- resolution = forbidden in **contracts**; allowed in **comments**, where
  `rule.forbid.domain-term-synonyms` explicitly permits an alternate perspective. the comments in
  `daoKeyrackHostManifest` and `daemonKeyStore` do say "map key", correctly and deliberately,
  because at that line the map is the subject. no operation may be named for it. dispute closed.

## .evidence

### three operations, two rounds, one noun

the term earns a cluster because it is not a single call site's local vocabulary:

```
asKeyrackKeySlugAtReach        constructs an address         (i008)
assertKeyrackHostAddressed     guards an address             (i009)
assertKeyrackReachAddressable  gates whether one is possible (i010)
```

`Addressed` and `Addressable` are the past-participle and capability forms of the same noun, and
each was reached for independently before the noun itself was itemized. **that is the signal a
term is real**: the derived forms arrive before anyone names the root.

### the invariant the noun protects

`assertKeyrackHostAddressed` exists because the host manifest records a key's reach **twice**:

```
hosts: {
  "ehmpathy.test.FOO@beav@ehmpathy.com": {   ← once, in the address
    slug: "ehmpathy.test.FOO",
    reach: { exid: "beav@ehmpathy.com" },   ← again, in the field
  }
}
```

and **different halves of the system read different copies** — a lookup addresses by the map key,
while `unlockKeyrackKeys` rebuilds from the entry's own fields. if the two disagree, a lookup and
an unlock yield different reaches, silently.

⚠️ **the guard rebuilds and compares; it never parses.** that is what keeps the construct-only
contract intact — the check is `asKeyrackKeySlugAtReach({slug, reach}) === address`, which needs
no split and therefore stays correct for a exid with an `@` in it.

### the shape generalizes past keyrack

three collections in this design had to key by identity rather than by slug, and each was found
separately (q3, q12, q8): the daemon store (in-memory), the host manifest (encrypted on disk),
and the repo manifest (committed yaml). the noun is what made the third one findable — once
"address" existed as a word, the question *"does this collection key by address?"* could be asked
of every store instead of rediscovered per store.

## .see also
- `term=reach._.choice._.md` — the exid the composite form carries
- `term=mech._.choice._.md` — the axis that decides whether a reach is derived, declared, or refused
- `rule.forbid.domain-term-synonyms` — the contract/comment split this cluster leans on twice
