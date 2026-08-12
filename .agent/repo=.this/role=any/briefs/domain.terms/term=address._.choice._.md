# domain.term: address

term.chosen   = address
term.kind     = noun
term.status   = DECLARED
term.synonyms.forbidden:
- partition key
- storage key
- store key
- map key
- composite key
- slug (for the composite form — see the split below)
- path
- locator

## .what

**the identifier a keyrack key is filed under.** it is the slug when a key names no reach,
and `$slug@$exid` when it does:

```
ehmpathy.test.FOO                       ← reachless: the address IS the slug
ehmpathy.test.FOO@beav@ehmpathy.com     ← a reach key: slug, then the reach exid
```

one address, one key. two reaches of one slug are **two addresses**, and therefore two keys
that were never one — which is the whole of *"you do not scope a key down, you cut a key per
lock."*

## ⚠️ address vs slug — the split, and why it is not a synonym

they coincide in the common case, so the temptation is to call both `slug`. they must stay apart
because **they have opposite parse contracts**:

| | `slug` | `address` |
|---|--------|-----------|
| shape | `org.env.name` | `slug`, or `slug@exid` |
| is it **parsed**? | ✅ **yes** — `asKeyrackKeyOrg`, `asKeyrackKeyEnv`, `asKeyrackKeyName` all split it | ❌ **never** — construct-only |
| why | its three segments are separately meaningful | a reach exid may legally hold `@` (an email is the obvious name for an account), so a split back is not well-defined |

**the address is construct-only.** it is built by `asKeyrackKeySlugAtReach` and compared whole;
no reader ever splits it apart. that is what lets an exid carry an `@` without ambiguity — the
composite stays injective because a slug never holds `@` except as its lead `@all` wildcard, and
because no code ever tries to reverse it.

> to name the composite `slug` would invite exactly the split that cannot be done.

## .why not one of the forbidden words

| word | why it is forbidden |
|------|---------------------|
| `partition key` / `storage key` / `store key` / `map key` | all four describe the **implementation** that holds it (a Map, a Record, a file). the domain fact is *where a key lives in the rack*, which outlives whichever structure stores it. ⚠️ these do appear in **comments**, which `rule.forbid.domain-term-synonyms` explicitly allows — a comment may describe a concept from an alternate perspective. they are forbidden in **contracts**: no operation may be named `getStoreKey` |
| `composite key` | database vocabulary; and it is wrong half the time, since a reachless address is not composite |
| `path` | already spent on the filesystem, and `getCredentialPath` hashes an address *into* a path — two distinct concepts, one hop apart |
| `locator` | generic; names the act of lookup rather than the identifier itself |

## .the three operations it holds together

the noun earns its cluster because three distinct operations, in two rounds, all turn on it:

| operation | what it does with an address |
|-----------|------------------------------|
| `asKeyrackKeySlugAtReach` | **constructs** one, from a slug + an optional reach |
| `assertKeyrackHostAddressed` | **guards** one — halts a manifest load when an entry's address disagrees with its own `slug` and `reach` fields |
| `assertKeyrackReachAddressable` | **capability** — throws when a vault's storage carries no reach at all, so an address could not encode one |

⚠️ `assertKeyrackHostAddressed` exists because a manifest records the reach **twice** — once
in the address, once in the entry's `reach` field — and different halves of the system read
different ones. it rebuilds and compares; it never parses.

## ⚠️ the split bites hardest on a PUBLISHED contract — a lived case

the table above argues the split on **parse contracts**, which is a code-reader's concern. on
2026-08-04 it bit one layer out, on the wire, where the cost is a broken consumer rather than a
confused reader.

`keyrack del --json` has emitted a field named `slug` since 2026-02-08. reach work changed its
**value** to an address:

```ts
{ slug: addressDeleted, effect: result.effect }   // ← the forbidden word, on a live contract
```

meanwhile `keyrack list --json` emits `slug` as the slug, with `reach` beside it. so one word
carried two senses across two commands of one cli — and the failure mode is the worst kind:
every **reachless** consumer still reads it correctly, so only the callers of the new feature
break. corrected to carry both, each under its own name:

```ts
{ slug, reach: reach ?? undefined, effect: result.effect }
```

**the rule this yields, beyond the term itself:** where a payload needs the composite, emit the
**pair** (`slug` + `reach`) and let the consumer construct the address, rather than emit the
address under either word. that keeps both names honest and keeps the reachless payload
byte-identical — `JSON.stringify` drops an `undefined`, so an absent reach adds no field at all.

⚠️ a **human** render may show the address whole (`keyrack del`'s tree does, and should — a
human named an address, so the tree echoes one back). the constraint is on **named fields**,
where a machine reads the name rather than the shape.

## .refs

the operations:
- `src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach.ts`
- `src/domain.objects/keyrack/assertKeyrackHostAddressed.ts`
- `src/domain.operations/keyrack/reach/assertKeyrackReachAddressable.ts`

⚠️ **corrected 2026-08-10** — the first and third moved into `reach/` when the cluster was
gathered, and the second sits under `domain.objects/` because it guards a manifest ENTRY's shape
rather than performs a key operation. all three prior paths were dead. **a cited path decays
faster than the term that cites it** — confirm with a glob before you trust one, the same way the
count note below says to re-derive rather than re-assert.

the stores that key by it:
- `src/access/daos/daoKeyrackHostManifest/index.ts` — the encrypted host manifest
- `src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore.ts` — the live grants

the readers and writers:
- `src/domain.operations/keyrack/setKeyrackKeyHost.ts`
- `src/domain.operations/keyrack/delKeyrackKey.ts`
- `src/domain.operations/keyrack/inferKeyrackKeyStatusWhenNotGranted.ts`

⚠️ **counts decay; re-derive, never re-assert.** to cite a number, re-run
`grep -rni 'address' src/domain.operations/keyrack` rather than trust a prior figure.

## .reason
see the ref-level cluster beside this choice:
- `term=address._.choice.reason.md` — etymology, disputes, evidence
