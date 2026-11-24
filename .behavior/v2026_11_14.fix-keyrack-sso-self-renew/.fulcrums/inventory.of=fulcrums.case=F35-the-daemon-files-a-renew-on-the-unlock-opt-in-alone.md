# F35 — the daemon files a renew on the unlock's opt-in alone

## .the fork

5.3 i003 r012 blocker.6: `renewDaemonGrantsDue.test.ts` [case11] once asserted the daemon files no renew for a non-sso grant. since the daemon renews via the mech adapter, it files a renew for any grant the unlock opted in, and [case11] now asserts a renewal at another address files none.

- **a** — the daemon checks, at file time, that the grant's mech adapter has `renewForDaemon`, and refuses the renewal otherwise
- **b** — the unlock is the one gate: it opts in only a grant whose adapter can renew (`unlockKeyrackKeys`), and the daemon trusts it

## .taken

b. the daemon owns the schedule and names no vendor; the adapter registry loads lazily, only when a renew runs (`getOneGrantRenewal`, rule.require.thinnest-import-path). a check at file time would load every adapter on every unlock. a foreign or stale cli that opts in a grant whose mech cannot renew is not silent: the first tick throws `MalfunctionError('mech has no renew path')` with its hint, the tick counts it as a fault, and status halts the key with that error named. so the invariant break is loud, at the cheapest place it can be seen.

## .rework

clean: one lazy import and one guard in `handleUnlockCommand`, plus [case11]'s old scenario.

## .confidence — 75%, why not higher

a check at file time would turn the loud halt into a refusal at unlock, which is earlier; the cost is the import on the unlock path, which no one has measured.

## .where

- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/handleUnlockCommand.ts`
- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/getOneGrantRenewal.ts`

## .verdict

open — to the commander at the pr.
