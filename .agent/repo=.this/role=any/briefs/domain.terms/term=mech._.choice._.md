# domain.term: mech

term.chosen   = mech
term.kind     = noun
term.status   = DECLARED
term.synonyms.forbidden:
- mechanism (as a FIELD or file-name segment — see the split below)
- method
- strategy
- provider
- scheme
- type
- kind
- how

## .what

**how a credential is acquired and delivered** — the one axis that names the machinery behind a
key, as opposed to where it is stored (`vault`), whose manifest declared it (`org`), or what it
opens (`reach`).

```
EPHEMERAL_VIA_GITHUB_APP     mint an installation token from an app + pem
EPHEMERAL_VIA_GITHUB_OIDC    mint via oidc
EPHEMERAL_VIA_AWS_SSO        mint against an sso profile
EPHEMERAL_VIA_SESSION        a session credential, carried through
PERMANENT_VIA_REPLICA        a human pastes a secret; it is stored as-is
PERMANENT_VIA_REFERENCE      a pointer to a secret held elsewhere
```

## ⚠️ the deliberate split: `Mechanism` in a TYPE, `mech` in a FIELD

this looks like the exact synonym drift `rule.forbid.domain-term-synonyms` forbids, and it is
not. the two forms are **one concept at two grammatical positions**, and the split is consistent:

| position | form | example |
|----------|------|---------|
| type / class name | `Mechanism` (full) | `KeyrackGrantMechanism`, `KeyrackGrantMechanismAdapter` |
| field / variable / file-name prefix | `mech` (short) | `mech: KeyrackGrantMechanism`, `mechAdapterAwsSso` |

**why the short form wins at the field position:** `rule.require.order.noun_adj` exists to make
autocomplete group a family under one prefix. `mech` does exactly that — every adapter file is
`mechAdapter*`, so one keystroke sequence surfaces the whole set. `mechanismAdapter*` would work
too, but nine extra characters on a prefix typed at every call site buys no clarity, because the
type it annotates already spells the word in full.

**the rule this obeys, not breaks:** one concept, one word — `mech` and `Mechanism` are the same
word at two lengths, the way `id` and `identifier` are. what would violate the rule is a second
*word* — `method`, `strategy`, `provider` — and those are forbidden below.

## .why not one of the forbidden words

| word | why it is forbidden |
|------|---------------------|
| `scheme` | ⚠️ **the sharpest one.** a reach was once a uri with a `scheme`; the 2026-08-03 amendment **deleted schemes from the domain entirely** (a reach is now plaintext). to reuse `scheme` for the mech axis would resurrect a word the domain deliberately retired, and a reader would ask which scheme is meant |
| `provider` | already spent — brains have providers (`fireworks`, `anthropic`), and a vault is closer to a "provider" than a mech is |
| `type` | `rule.prefer.kind-over-type` steers away from `type` generally |
| `kind` | too generic **here specifically**: a keyrack key has several kinds at once (its vault kind, its mech, its grade). `kind` names none of them unambiguously |
| `method` / `strategy` | generic programmer-words; they name the pattern, not the domain fact. the domain fact is *how this credential comes to exist* |
| `how` | reads as a question, not a noun |

## .refs

the enum and the contract:
- `src/domain.objects/keyrack/KeyrackGrantMechanism.ts` — the enum itself
- `src/domain.objects/keyrack/KeyrackGrantMechanismAdapter.ts` — the adapter contract

the field, on three dobjs:
- `src/domain.objects/keyrack/KeyrackKeySpec.ts`
- `src/domain.objects/keyrack/KeyrackKeyHost.ts`
- `src/domain.objects/keyrack/KeyrackKeyGrant.ts`

the adapters, whose file names carry the prefix:
- `src/domain.operations/keyrack/adapters/mechanisms/aws.sso/mechAdapterAwsSso.ts`
- `src/domain.operations/keyrack/adapters/mechanisms/mechAdapterGithubApp.ts`
- `src/domain.operations/keyrack/adapters/mechanisms/mechAdapterReplica.ts`

⚠️ **counts decay; re-derive, never re-assert.** to cite a number here, re-run
`grep -rn '\bmech\b' src/` rather than trust a figure a prior traveler wrote down.

## .reason
see the ref-level cluster beside this choice:
- `term=mech._.choice.reason.md` — etymology, disputes, evidence
