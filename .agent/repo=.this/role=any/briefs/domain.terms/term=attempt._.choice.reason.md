# domain.term.choice.reason: attempt

## .etymology

why `attempt`: the word names the **try**, not the **prize** — so it is true on every branch of
the union. a keyrack read has four outcomes (`granted`, `absent`, `locked`, `blocked`), and only
one of them holds a credential. a noun that named the prize would be a lie on three branches.

chosen over:

- **`result`** — generic to the point of empty; it names no domain and could label the return of
  any procedure in the repo. it also invites `resultResult` compounds at the call site
- **`outcome`** — truer than `result`, but it reads as **terminal**. an attempt is not: a `locked`
  attempt is an invitation to `--unlock` and try again, and `asResolvedAttempt` exists precisely
  to carry one forward. "outcome" would make a retryable state sound final
- **`response`** — RESERVED, and forbidden here for the same reason `request` is forbidden for
  `ask`: the keyrack daemon speaks a real wire protocol, so `response` names the serialized
  message that travels the socket. to spend it on the in-process envelope would overload it
  across a value and its transport
- **`resolution`** — a nominalization that collides with `asResolvedAttempt`, where "resolved" is
  an ADJECTIVE on an attempt rather than a second noun for the attempt itself

## .the invariant the term carries

> **an attempt is total: every slug asked for yields exactly one attempt, whatever happened.**

this is what makes the word load-bearing rather than decorative. the alternative shape — return
the grants and throw or omit for the rest — is the `rule.forbid.failhide` trap: a caller reads a
short array as "these are your keys" when it means "these are the ones that worked."

two consequences a reviewer can check:

1. **a filter must narrow on the slug, never on the status.** `getAllKeyrackAttemptsForOrg` reads
   through `asKeyrackAttemptSlug`, which every branch of the union answers. to filter granted
   attempts alone would drop exactly the rows that TELL a human a key is locked — the report
   collapses to silence at the moment it matters most
2. **the slug alone is not an identity.** once `reach` is an axis, two reaches of one key that
   both come back `locked` are indistinguishable by slug, so a collection keyed on slug evicts
   one with the other. hence `KeyrackGrantAttemptAtReach` puts `reach` on the NON-granted
   branches too (`KeyrackGrantAttempt.ts:25-37`)

## .disputes

### dispute: result — raised 2026-08-25 — status: RESOLVED (keep `attempt`)
- raised.by  = execution stone, `v2026_08_25.fix-keyrack-all-skips-manifest`
- claim      = `result` is the conventional word for what a procedure returns, and reads plainer
               than `attempt` to a newcomer
- counter    = plainness is the problem. `result` names no domain and is true of every return in
               the repo, so it partitions no set — and the compound reads `KeyrackGrantResult`,
               which asserts a grant on branches that hold none. `attempt` is honest across the
               whole union, which is the property the type exists to have
- resolution = keep `attempt`; record `result` as a forbidden synonym

### dispute: outcome — raised 2026-08-25 — status: RESOLVED (keep `attempt`)
- raised.by  = execution stone, `v2026_08_25.fix-keyrack-all-skips-manifest`
- claim      = `outcome` is more specific than `result` and reads naturally on a union of states
- counter    = `outcome` connotes finality. a `locked` attempt is explicitly NOT final — it is the
               state `--unlock` exists to advance, and `asResolvedAttempt` carries one forward
               into a second pass. a word that implies the story ended would misdescribe the one
               state the caller is most likely to act on
- resolution = keep `attempt`; record `outcome` as a forbidden synonym

## .evidence

- **discovery**: dimensional decomposition of the read. axes = {was the key found on the host?} ×
  {is the vault open?} × {does the value satisfy the mechanism?}. the product yields exactly the
  four declared branches, and no cell is empty — which is why the union is total and why a noun
  that covers all four was required
- **the declared dobj**: `KeyrackGrantAttempt.ts:4-14` — *"result of attempt to grant a key …
  this is the 'envelope' — contains either a grant or error info"*
- **invariants**: a `granted` attempt carries `grant` and no `slug` field of its own (the slug
  rides on the grant); the other three carry `slug` + a human-facing `message`/`reasons` and an
  optional `fix`. so every non-granted branch owes a fix line — the
  `rule.require.errors-name-the-fix` contract, encoded in the type

## .see also

- `term=grant._.choice._.md` — 🔴 unitemized; the thing an attempt may carry (open glossary debt)
- `term=ask._.choice._.md` — what an attempt answers; `request` is RESERVED there for the same
  wire-protocol reason `response` is RESERVED here
- `term=blocked._.choice._.md` — one of the four branches, already itemized
- `term=filter._.choice._.md` — why a filter reads the slug, never the status
