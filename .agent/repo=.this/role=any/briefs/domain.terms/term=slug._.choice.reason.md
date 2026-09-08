# domain.term.choice.reason: slug

## .why it comes due NOW, after four rounds on the deferred list

`slug` led the open-glossary-debt table for four rounds (i006, i020, i021, and the vision round).
two triggers fired together this round, and either alone would have been sufficient:

1. **a dop was declared that carries the noun** — `asKeyrackAskSlugParts`
   (`rule.require.domain-term-itemization`)
2. **the ambiguity acquired a price** — the i020 lesson recorded in `progress.md`: *"a deferred
   term comes due when its ambiguity acquires a PRICE."* this round it cost twice, in two
   different ways, on two different verb families (see the evidence below)

## .etymology

**`slug`** is borrowed from the print newsroom, where a slug is the short, human-legible, unique
label a story is filed under — stable, typeable, and meaningful to a person rather than a machine.
the keyrack sense keeps all three properties and adds one: it is **self-described**, so it carries
its own provenance rather than a pointer to some record that holds it.

the word was already in the tree before this cluster; it was **discovered, never invented**
(`howto.domain-discovery`, move 1) — the domain spoke it at ~20 sites, and this file exhumes what
those sites already agreed on.

## .the rejected synonyms, each because it names something else

| rejected | why |
|---|---|
| `id` | an id is opaque and machine-minted. a slug is READ — its whole value is that a human, and any verb, can decode it without a lookup |
| `name` | already spent, and spent on the PART: `keyName` is the third segment. to also call the whole a "name" would overload one word onto a whole and its part, which is the worst shape of overload |
| `path` | implies a filesystem or a hierarchy with a root. a slug's three segments are three ORTHOGONAL axes (provenance × environment × identity), not a descent |
| `address` | already spent in this repo for the clone/zone sense (`term=address`, `define.address-sigils`). the sigil vocabulary there (`@this`, `@all`) is shared, which makes the collision MORE likely to mislead rather than less |
| `fqn` / `qualified-name` | shouts, and imports java/namespace vocabulary the domain never speaks (`rule.forbid.shouts`, `rule.require.ubiqlang`) |
| `keyname` | ⚠️ **RESERVED, not merely rejected.** `keyName` is a real term for a real segment — the slug's third. to spend it on the whole triple would collapse the exact distinction the `reduce-before-compose` invariant depends on |

## .evidence — the invariants were each paid for

### `.invariant.decidable` — paid at the parse boundary

`isKeyrackSlugFormat` and `asKeyrackSlugFullOrNull` both demand a valid env at segment 1, and both
say so in their own `.note`. that guard is what lets `--key` accept two spellings at once: a dotted
key name like `my.api.KEY` stays a bare name rather than a rewrite into an org it never named.

⇒ a dot count is never a slug test. the check is a vocabulary membership test, never a shape test.

### `.invariant.reduce-before-compose` — paid by a written key nobody could read

`set` was handed a full slug and passed it into a composer that composes `$org.$env.$key`. the
result was `@all.camp.@all.camp.SLUG_KEY`: a credential written under a name **no read verb can
spell**, and one its own `del` twin could not remove. the write half and the read half of one pair
disagreed about what a slug means.

the fix was not a guard but a REDUCTION — and, once both mutation verbs needed it, one shared
operation. spelled twice, the two copies drifted on guard order, so a slug that conflicted on both
axes drew a different refusal from each verb (`rule.forbid.surprises`, nielsen-4).

### `.invariant.one-decoder` — paid twice, on two axes, one round apart

a daemon status row carries a `slug` AND its own stored `.org` / `.env`, each minted by a fallback
chain (`unlockKeyrackKeys.ts:471-477`). the two can disagree — a grant that falls through every
source records `'unknown'` for org while its slug still says `@all`.

- the **org** axis was found first: `status --org @all` read the stored field and dropped a key
  that `list --org @all` — slug-derived, over the same rack — kept
- the **env** axis was left, documented as a deliberate scope boundary, and a reviewer correctly
  refused that split one round later. one operation that read two different fields for two flags a
  human composes in one command is not a boundary; it is the same hazard, moved

⇒ the general form, and the reason this is an invariant of the TERM rather than of one function:
**a slug's segments are the truth; a field stored beside it is a record of a lookup.** when they
disagree, the slug wins.

⚠️ the shape both defects share is that they are **silent**. no error on either side, and every
test whose fixture had the two fields in agreement stayed green. only a row where the slug and the
stored field DISAGREE can read which one a verb consulted — which is why each axis owes a clamp
built on exactly that shape.

## .disputes

none open. `keyname` is RESERVED rather than disputed — it is a distinct, live term for the slug's
third segment, and this cluster exists partly to keep the two apart.

## .see also

- `term=machine-wide._.choice._.md` — what the `@all` org segment means
- `term=manifest._.choice._.md` — the two racks a slug can be declared in
- `term=grant._.choice._.md` — 🔴 still open debt; a grant is a slug plus its value and status
- `term=key` / `term=org` — 🔴 still open debt; both compose declared dobjs
