# F16 — the renew schedule reads wall time, because expiries are wall instants

## .the fork

i002 r007 nitpick.2: `scheduleAutoTermination` uses the monotonic `performance.now()`; the renew tick reads the wall clock, so a backward clock jump delays renews.

- **a** — schedule the renew off a monotonic clock
- **b** — keep wall time, and name the limit

## .taken

b. the renew compares each grant's `expiresAt` and `capAt`, which are absolute wall instants that aws and the human set. a monotonic clock has no epoch, so it cannot say how far a wall instant is from now; the auto-termination timer measures an idle span, which a monotonic clock fits. the store's purge and ttl read the same wall clock, so the daemon's view stays self-consistent: after a backward jump, every expiry reads later together, and the renew fires once the wall clock reaches its window.

## .rework

clean: a monotonic offset captured at unlock, per entry, if a future need arises.

## .confidence — 80%, why not higher

a large backward jump (vm resume) can hold a renew past the upstream's real expiry, and a consumer then meets a stale credential until the wall clock catches up.

## .where

- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/scheduleDaemonRenewTick.ts`
- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/getAllRenewEntriesDue.ts`

## .verdict

open — to the commander at the pr.
