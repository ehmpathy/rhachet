# F21 — an unchanged expiry on a dead grant is a fault

## .the fork

the vision holds that an unchanged renew expiry "writes naught, counts naught, and tries again next tick, when the creds sit closer to their end". the code had counted every unchanged expiry as a fault, so ten in a row halted a renewable key (r8 blocker.1, r11 #3). the repair follows the vision; one edge the vision's sentence does not reach is still owed a call: the held grant has already expired, and the cli still returns that same dead expiry.

- **a** — the vision, read wide: an unchanged expiry never counts, on a live grant or a dead one
- **b** — the vision on a live grant; on a dead grant, the unchanged expiry counts as a fault, so ten in a row halt with `renew returned no later expiry`

## .taken

b. the vision's reason for the wait is "when the creds sit closer to their end", and a dead grant sits past its end, so no later tick can deliver the cure the wait waits for. under a, a cli that returns one stale expiry forever leaves the key dead with no mark, retried each tick for the rest of the cap. that is the quiet stall the vision's own "a stall is as loud as a lapse" forbids (case 7).

## .rework

clean: drop the `isRenewEntryGrantLive` branch in `renewOneEntry` (one `if`), delete `isRenewEntryGrantLive.ts`, and drop `renewDaemonGrantsDue.test.ts` case4 [t0.3]. no other caller.

## .confidence — 85%, why not higher

the vision's sentence is unconditional on its face; b reads a limit into it from its own stated reason. a wisher who meant the sentence whole would choose a.

## .where

- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/renewDaemonGrantsDue.ts`
- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/isRenewEntryGrantLive.ts`
- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/renewDaemonGrantsDue.test.ts` case4 [t0.1], [t0.3]

## .verdict

open — to the commander at the pr.
