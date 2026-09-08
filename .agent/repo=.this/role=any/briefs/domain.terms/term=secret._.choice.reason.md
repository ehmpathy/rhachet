# domain.term.choice.reason: secret

## .etymology

latin *secretus* — "set apart, hidden". the word carries the hazard in its own root: a secret is
defined by what must NOT happen to it, which is exactly the property the keyrack domain needs a
word for.

the domain already had three good words for a credential — `key` (its address), `slug` (its
qualified address), `grant` (its looked-up record). what it lacked was a word for **the value seen
as a leak hazard**, and the absence showed: the render mask's regex enumerated
`secret|password|passphrase|token|credential|prikey|privatekey` with no name for what the seven
have in common.

⚠️ **the absent word IS the defect.** with no name for the class, the mask could only be keyed on
the members — a key-name test — and a key-name test is only as strong as the name discipline of
every throw site that will ever exist. the moment a value landed under `value`, `body`, `data`, or
`context`, it printed. to name the class is what made a value-shaped mask thinkable.

## .why not `credential`

`credential` is the whole thing — address, value, provenance, expiry. `secret` is only its value,
and only as a hazard. an operation that looks a credential up yields a `grant`; one that asks
whether bytes may be printed answers about a `secret`. two concepts, two words
(`rule.forbid.domain-term-ambiguity`).

## .why not `token` / `password` / `passphrase` / `privatekey`

each is a HYPONYM — one kind of secret, not the class. to elect any of them is the classic
overload trap: `token` would then mean both "an oauth bearer" and "any value that must not print",
and a reader could not tell which sense a name carried.

the evidence is in the extant mask's own regex: it lists all four **beside** `secret`, which is
only coherent if `secret` is the superordinate. the code had already made the choice; this file
records it.

## .why not `sensitive`

`sensitive` is an adjective for a POLICY posture (who may see it), not for the value. it invites a
spectrum — "how sensitive?" — where the domain needs a binary: printable, or masked. a word that
invites a spectrum will grow a middle tier, and a middle tier on a credential mask is a leak with
a rationale attached.

## .disputes

### dispute: token  —  raised 2026-09-03  —  status: RESOLVED (keep `secret`)
- raised.by  = mechanic (self, during the value-mask fix)
- claim      = `token` is the word this repo says most often — `GITHUB_TOKEN`, `SHARED_TOKEN`,
               `npm_` tokens — so a reader would recognize it fastest
- counter    = frequency is not genericity. every one of those is a token AND a secret; the
               reverse fails — an ssh private key and a database password are secrets and are not
               tokens. to name the class after its most common member makes the class look
               narrower than it is, which is precisely how the key-name mask came to read as
               sufficient. `secret` also matches the extant regex's own first alternative.
- resolution = keep `secret`; record `token`, `password`, `passphrase`, `privatekey` as forbidden
               synonyms. they remain legal as KEY NAMES in a manifest (`GITHUB_TOKEN` is an
               address, not a term) — the forbid governs CONTRACTS, per
               `rule.forbid.domain-term-synonyms`

## .evidence

**the class already existed in code, unnamed** — `getKeyrackBlockedReport.ts`'s key-name mask
tests seven words in one alternation. seven words with one shared consequence is a class with no
term, which is the condition `rule.require.domain-term-itemization` exists to catch.

**the boundary against `key`/`slug`/`grant` is observable, not stylistic.** across the keyrack
domain, ~20 operations address, look up, sweep, and filter credentials and NOT ONE of them needs
the value's hazard class — they say `key`, `slug`, or `grant` throughout. exactly one operation
asks the hazard question, and it is the one this term is declared on. a term with one honest use
site is narrow by evidence rather than by assertion.

**the invariant is checkable** — `isKeyrackSecretShaped` returns `boolean`, never a value. a
future `*Secret*` operation that returns a `string` is either mis-named or a leak, and the rule
above lets a reviewer say which without a debate.

## .see also
- `term=mask._.choice._.md` — the operation performed on a secret
- `rule.require.refusals-carry-context` — why the render prints every field, which is what makes
  the mask load-bearing rather than incidental
