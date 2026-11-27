# F19 — a fault halt waits for a human

## .the fork

i005 r011 nitpick.4: once a network blip counts as a fault (not a lapse), ten ticks offline mark the key `halted`, and only a hand unlock cures it.

- **a** — a halted entry retries on a slow backoff (about every 15m) while status keeps the mark; a lapse and a defect still wait for a human
- **b** — a halt is terminal until an unlock or a relock, as the vision's case 7 states

## .taken

b. the vision makes a stall as loud as a lapse and bounds retries (case 7). ten ticks span the whole renew window, so a halt lands near the grant's own expiry: past it, a later success could only revive a key that already went dark, which is the silent recovery the halt exists to name. a backoff also adds a second retry schedule beside the tick, and a third mark state (halted-but-tried) for status to render.

## .rework

clean: one branch in `renewDaemonGrantsDue` that treats a `halted` mark older than the backoff as due, one test case, one status note.

## .confidence — 75%, why not higher

a laptop offline for a train ride is a real path, and a backoff would save that human one unlock while the portal still lives.

## .where

- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/renewDaemonGrantsDue.ts`
- `src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonRenewRecord.ts`

## .verdict

open — to the commander at the pr.
