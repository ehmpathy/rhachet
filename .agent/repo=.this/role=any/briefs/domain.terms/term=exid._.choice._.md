# domain.term: exid

term.chosen   = exid
term.kind     = noun
term.status   = DECLARED
term.synonyms.forbidden:
- label          # a label names for a HUMAN to read; an exid names for a SYSTEM to address. see the split
- externalId     # the long form; `exid` is the settled short one, and mixed spellings read as two fields
- external_id
- foreignKey     # database vocabulary, and it implies a join we do not perform
- handle
- locator
- ref            # already spent: `Ref<typeof X>` is the domain-objects reference type

## .what

**the id the EXTERNAL system knows.** it is the name we **address by** — a value some other
system assigned, which we store verbatim and hand back when we go there.

the whole term rests on one question: **who named it?**

| term | who assigned it | what it is for |
|------|-----------------|----------------|
| `slug` | **us** | our own canonical name for a thing (`org.env.name`) |
| `exid` | **them** | the name the other side answers to — we address by it |
| `label` | **a human** | a name a human reads; it names, it does not address |

## ⚠️ exid vs label — the split this term exists to hold

they look alike (both are opaque strings a human may have typed), so the temptation is to call
every such string a `label`. the split is **what the value DOES**:

| | `label` | `exid` |
|---|---------|--------|
| read by | a human, on a screen | a system, to route or fetch |
| may it be changed freely? | ✅ yes — it is cosmetic | ❌ no — a change points somewhere else |
| may it be omitted? | often | never, where it addresses |
| if it is wrong | a display reads oddly | **you reach the wrong thing** |

> the test: **would a change to this value alter WHERE the system goes?** yes → `exid`. no →
> `label`.

a `label` that routes is misnamed, and dangerously so: it invites a reader to treat a
load-bearing address as cosmetic. that is exactly the defect the 2026-08-12 dispute corrected on
`KeyrackKeyReach` — see `.reason`.

⚠️ **`label` is NOT forbidden outright.** `KeyrackKeyRecipient.label` is a genuine, correct
label — a human-readable name for a decryptor (`'vlad@laptop'`), read by a human and by no
machine. one word, one sense, kept apart from this one by the test above.

## ⚠️ two exids sit near each other, and they are NOT one concept

both are correct. a reader who meets both deserves the note:

| field | the external system | the value |
|-------|--------------------|-----------|
| `KeyrackKeyHost.exid` | the **vault** that stores the secret | a 1password item id, an aws.params path |
| `KeyrackKeyReach.exid` | the **reach** the credential opens | `beav@ehmpathy.com`, `github://org=ehmpathy` |

they live on different objects and are **never compared**. the shared word is right — each is
the id its own external system knows — but neither is a synonym of the other.

## .an exid is stored verbatim, and validated barely

keyrack does not own the grammar of an exid, so it does not police one. `asKeyrackKeyReach`
refuses only an empty value or one that holds whitespace — and that pair is about the *address*
it rides inside (`$slug@$exid`) staying readable, never about the exid's own shape.

exactly one consumer reads sense into an exid, and it does so **locally**:
`asGithubOrgFromReach` requires the `github://org=$org` convention, because the github-app mech
must mint against one org's installation. that convention lives in the mech, never in the
domain.

> ⚠️ a corollary worth its own line: **an exid asserts no grammar keyrack validates, and that is
> fine.** `KeyrackKeyHost.exid` has been an unvalidated external id since it was declared. the
> counter *"`exid` promises a shape we do not check"* proves too much — it would condemn the
> extant field equally. recorded in `.reason` as one of two counters that lost.

## .refs

the fields:
- `src/domain.objects/keyrack/KeyrackKeyReach.ts`   # the reach's exid
- `src/domain.objects/keyrack/KeyrackKeyHost.ts`    # the vault storage's exid

the operations:
- `src/domain.operations/keyrack/reach/asKeyrackKeyReachExid.ts`   # the render (was …ReachLabel)
- `src/domain.operations/keyrack/adapters/mechanisms/asGithubOrgFromReach.ts`  # the one local parse

the migration the rename owed:
- `src/access/daos/daoKeyrackHostManifest/schema.ts`       # reads `label`, writes only `exid`
- `src/access/daos/daoKeyrackHostManifest/schema.test.ts`  # `[case5]` — the clamp, dogfooded

⚠️ **counts and paths decay; re-derive, never re-assert.** confirm with a glob before you trust
a path here — `term=address` records a round where three cited paths had all gone dead.

## .reason
see the ref-level cluster beside this choice:
- `term=exid._.choice.reason.md` — etymology, the `label` dispute, evidence
