# domain.term: slug

term.chosen   = slug
term.kind     = noun
term.synonyms.forbidden:
- id
- name
- path
- address
- fqn
- qualified-name
- keyname          # RESERVED — `keyName` is the slug's THIRD SEGMENT, never the whole triple

## .what

the full, self-describing name of one keyrack credential: `org.env.keyName`.

a slug names its own provenance. that is the whole point of the word — handed a slug alone, any
verb can say which org and which env the credential belongs to, with no manifest, no flag, and no
ambient state.

## .the shape

| segment | position | example | notes |
|---|---|---|---|
| org | 0 | `ehmpathy`, `@all` | `@all` means MACHINE-WIDE (`term=machine-wide`) |
| env | 1 | `prep`, `camp`, `all` | must be a VALID env — this is what makes a slug decidable |
| keyName | 2+ | `API_KEY`, `API.KEY.V2` | the REST of the string; may itself carry dots |

## ⚠️ .invariant.decidable — a slug is not merely a dotted string

segment 1 must be a valid env, or the value is a bare key NAME rather than a slug.

`my.api.KEY` has three dot-separated segments and is **not** a slug — `api` is no env. this is what
lets `--key` accept both spellings without ambiguity, and it is enforced in exactly one place
(`isValidKeyrackEnv`, read by `isKeyrackSlugFormat` and `asKeyrackSlugFullOrNull`).

⇒ a dot count is never a slug test. anything that reaches for `split('.')` to decide has already
broken the invariant.

## ⚠️ .invariant.one-decoder — the slug is the one source of a key's provenance

a credential's org and env are read FROM ITS SLUG, through one decoder — never from a field some
other process stored beside it. a daemon row carries both a `slug` and its own `.org` / `.env`,
minted by a fallback chain (`unlockKeyrackKeys.ts:471-477`), so the two can disagree.

when they disagree, **the slug is right and the stored field is a record of a lookup**. two verbs
that read different fields answer the same question two ways over one rack, with no error on
either side — which is the defect class this invariant exists to close.

## ⚠️ .invariant.reduce-before-compose — a slug is never handed to a composer

`$org.$env.$key` composition takes the **keyName**, never the slug. handed a slug whole, a composer
yields `@all.camp.@all.camp.SLUG_KEY` — a name no read verb can ever spell, and one its own `del`
twin cannot remove.

⇒ every mutation verb REDUCES an ask to its triple first, through one shared operation
(`asKeyrackAskSlugParts`), which is also where a slug that contradicts its flags is refused.

## .what a slug is NOT

| word | what it names | why it is not `slug` |
|---|---|---|
| `key` | what the `--key` flag accepts — EITHER a bare name OR a full slug | the flag is deliberately two-valued; the slug is the self-describing one of the two |
| `keyName` | the slug's third segment alone | the part, never the whole |
| `grant` | a slug plus its resolved value and status | the slug is a grant's NAME, not the grant |

## .refs

the decoders (the only places the shape is read):
- src/domain.operations/keyrack/asKeyrackSlugFullOrNull.ts
- src/domain.operations/keyrack/isKeyrackSlugFormat.ts
- src/domain.operations/keyrack/asKeyrackSlugParts.ts
- src/domain.operations/keyrack/asKeyrackKeyOrg.ts
- src/domain.operations/keyrack/asKeyrackKeyEnv.ts
- src/domain.operations/keyrack/asKeyrackKeyName.ts
- src/domain.operations/keyrack/asKeyrackKeySlug.ts

the operations that carry the noun:
- src/domain.operations/keyrack/cli/asKeyrackAskSlugParts.ts
- src/domain.operations/keyrack/getAllKeyrackSlugsForOrg.ts
- src/domain.operations/keyrack/getAllKeyrackSlugsForEnv.ts
- src/domain.operations/keyrack/isKeyrackSlugMachineWide.ts
- src/domain.operations/keyrack/isKeyrackSlugRepoBound.ts
- src/domain.operations/keyrack/asKeyrackSlugOrgKind.ts

## .reason

see the ref-level cluster beside this choice:
- `term=slug._.choice.reason.md` — etymology, rejected synonyms, the evidence each invariant cost
