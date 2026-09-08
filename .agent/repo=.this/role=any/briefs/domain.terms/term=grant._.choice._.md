# domain.term: grant

term.chosen   = grant
term.kind     = noun
term.synonyms.forbidden:
- credential  # RESERVED — the SECRET itself; a grant is the right to read one (see .note)
- secret      # RESERVED — its own term, at the value grain
- access      # names the verb, never the noun a caller holds
- permission  # a policy concept; a grant is a materialized, time-bound answer
- token       # one vault's shape of a secret, never the wrapper
- entitlement # enterprise jargon; the domain says grant

## .what

a **materialized answer to one keyrack ask** — the resolved right to read one credential, with
the metadata that says how it was resolved and how long it holds.

a grant is what a caller receives; it is NOT the secret and NOT the policy. it wraps:

| the grant carries | |
|---|---|
| the slug it resolved to | `$org.$env.$KEY` |
| the mech that yields the value | e.g. `EPHEMERAL_VIA_GITHUB_APP` |
| the vault it is held in | `os.secure`, `aws.params`, … |
| its state | `granted` / `locked` / `blocked` |
| its bound | a max duration, where the mech is ephemeral |

## .why a grant is its own noun

the three grains must stay separable, and one word for all three would collapse them:

```
policy   — what the manifest DECLARES may be read   (keyrack.yml)
grant    — what THIS ask resolved to, right now     (a KeyrackKeyGrant)
secret   — the value itself                          (never logged, never snapped)
```

a `locked` grant is the case that proves the split: it exists, names its slug, and carries the fix
(`rhx keyrack unlock …`) while it holds **no secret at all**. so a grant is real and useful
precisely when the credential is absent — which a word like `credential` or `secret` could never
express.

## .refs

**the domain object**
- src/domain.objects/keyrack/KeyrackKeyGrant.ts

**the operations this repo declares on it**
- src/domain.operations/keyrack/getKeyrackKeyGrant.ts
- src/domain.operations/keyrack/getKeyrackKeyGrants/getKeyrackKeyGrants.ts
- src/domain.operations/keyrack/getOneKeyrackGrantByKey.ts
- src/domain.operations/keyrack/genContextKeyrackGrantGet.ts     # the read context a grant resolves in
- src/domain.operations/keyrack/cli/getOneKeyrackGrantByKeyOrEmitBlocked.ts

**where a grant renders**
- src/domain.operations/keyrack/cli/asKeyrackStatusKeyBranch.ts
- src/domain.operations/keyrack/getKeyrackBlockedReport.ts   # the blocked grain

## .note — `grant` is NOT `credential` / `secret`

- **`grant`** = the resolved right + its metadata; safe to render, snapshot, and log
- **`secret`** = the value; never rendered, never snapshotted (`term=secret`)
- **`credential`** = colloquial for the pair; forbidden in contracts because it reads as either

⚠️ this split is a **safety** boundary, not a style one: every snapshot in the acceptance tier
renders grants. were the two words one, a render meant for a grant would sooner or later be
pointed at a secret.

## .reason

see the ref-level cluster beside this choice:
- `term=grant._.choice.reason.md` — etymology, disputes, evidence
