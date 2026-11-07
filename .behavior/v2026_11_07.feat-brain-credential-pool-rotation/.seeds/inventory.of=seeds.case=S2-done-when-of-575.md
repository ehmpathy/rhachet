# seed S2 — the done-when of #575

source: ehmpathy/rhachet#575 body (dispatched by human + beaver)

## .said

> ## 🔴 .start from scratch
>
> `ehmpathy/rhachet#324` (`vlad/enroll-auth-swap`, april 2026) is a prior spike at the same problem. **cross-reference it, but do not build on it** — rhachet's architecture changed a lot since then (the shared-login model in #571, the actor dirs, keyrack's vaults). re-derive the design against today's code. where #324's research still holds, cite it; where it does not, say so.

> ## .done when
>
> - a repo can declare a default pool and a custom pool set, and an actor draws from it with no human sign-in
> - capacity per credential is read and shown
> - the pick prefers the soonest reset and re-runs hourly; a capped credential is never chosen while a peer in the pool has headroom
> - the swap is verified by a before/after account compare, never by the exit code alone
> - tested against at least two real subscriptions

## .settled

five clauses bound the behavior: declare (default + custom), read and show capacity, pick soonest-reset
hourly with no capped pick while a peer has headroom, verify by account compare, prove on two real
subscriptions. #324 is cited, never built on.

## .landed

- `1.vision.yield.md` — each clause maps to a section of the contract
