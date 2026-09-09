# domain.term.choice.reason: grant

## .etymology

`grant` was exhumed, never invented: the domain object is `KeyrackKeyGrant`, and the operations
that yield it (`getKeyrackKeyGrant`, `getOneKeyrackGrantByKey`, `genContextKeyrackGrantGet`) all
predate this behavior.

the word carries the right sense from ordinary english and from access-control literature alike:
a grant is **something conferred, to a named party, for a bounded time**. all three properties
hold here — conferred by the manifest's policy, to one owner, bounded by a max duration where the
mech is ephemeral. no other candidate carries all three.

`credential` is the word a human reaches for first, and that is exactly why it is forbidden: it
reads as *the secret* to most readers and *the right to it* to some, so it cannot appear in a
contract without a re-read (`rule.forbid.ambiguous-labels`).

## .the test that settles it

> can this noun exist, and be useful, when the secret is absent?

- **grant** → yes. a `locked` grant names its slug, its vault, its mech, and its fix, with no
  value present. it is the most common shape the cli renders
- **credential / secret / token** → no. each names the value; absent the value, no referent
  remains to name

⇒ they are different nouns, and the domain needs the one that survives absence.

## .disputes

### dispute: credential — raised 2026-09-06 — status: RESOLVED (keep `grant`)
- raised.by  = beav (this behavior)
- claim      = the cli's own help text says "configure storage for a credential key", and humans
               say credential, so the domain word should follow the human word
- counter    = `credential` is the right word in **prose to a human**, and it stays there. it is
               wrong in a **contract**, because a `KeyrackKeyCredential` would read as the value,
               and the object's most common state is one that holds no value. the split is also a
               safety boundary: grants are snapshotted in the acceptance tier, secrets never are.
               one word for both would eventually point a render at a secret
- resolution = keep `grant` in every contract; `credential` stays allowed in human-faced prose and
               help text. recorded as a forbidden synonym at the contract grain. closed.

### dispute: permission — raised 2026-09-06 — status: RESOLVED (keep `grant`)
- raised.by  = beav
- claim      = `permission` is the established access-control noun and would be recognized faster
- counter    = a permission is **standing policy** — true of a subject regardless of any ask. a
               grant is **the answer to one ask, at one moment**, and it can be `locked` now and
               `granted` a second later with the policy unchanged. the manifest holds the
               permission; the grant is what a read of it produced
- resolution = keep `grant`. the policy grain is the manifest's, and it is named there. closed.

## .evidence

**the three grains are separately declared in code**, which is what makes them three terms:

| grain | where it lives |
|---|---|
| policy | `.agent/keyrack.yml` + the host manifest schema |
| grant | `src/domain.objects/keyrack/KeyrackKeyGrant.ts` |
| secret | never a declared object — it transits, and is masked at every render |

**a grant renders while a secret does not** — `asKeyrackStatusKeyBranch.ts` and
`getKeyrackBlockedReport.ts` both render grant metadata into snapshotted output, and the
acceptance tier locks those snapshots. `term=mask` names the discipline that keeps the value out.

**the blocked grain is a grant, not an error** — `getKeyrackBlockedReport.ts` produces a report
FROM a grant that could not be served, so even a refusal is expressed as grant metadata rather
than a bare throw. that is coherent only if a grant is the wrapper, never the value.

## .invariants

- a grant names exactly one slug; a multi-key ask yields many grants, never one compound grant
- a grant is renderable and snapshot-safe; a secret is neither
- a grant exists in `locked` and `blocked` states where no secret is present
- a grant is the answer to ONE ask at ONE moment; it is never cached as standing policy
