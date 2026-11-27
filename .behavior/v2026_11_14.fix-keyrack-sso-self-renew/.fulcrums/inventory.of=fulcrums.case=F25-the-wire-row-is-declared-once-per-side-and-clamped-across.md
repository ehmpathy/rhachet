# F25 — the wire row is declared once per side, and clamped across

## .the fork

i001 r011 #7: the status row shape is declared three times — the svc handler's return, `getAllStatusRowsMarkedExpired`, and the sdk `DaemonStatusRow` — with the `'lapsed' | 'halted'` union inlined in the sdk.

- **a** — one shared type in `domain.objects/keyrack`, imported by both svc and sdk
- **b** — one declaration per side of the wire: the svc casts every row through `asDaemonStatusRow`, the sdk declares what it reads, and a test clamps the two

## .taken

b. the svc's two sites now share one cast (`asDaemonStatusRow`), so the svc declares the row once. the sdk is the client half of a socket contract; it states what it reads, so a server change that breaks a client fails at its own type, not at a shared import that both sides drift with together. `handleCommands.test.ts` asserts the server rows are assignable to `DaemonStatusRow`, before and after a json round trip, so the two cannot drift unseen.

## .rework

clean: lift `DaemonStatusRow` and the mark union into `domain.objects/keyrack`, and point the svc cast's return type at it.

## .confidence — 80%, why not higher

the rule's 3+ reuse exception reads to favor a, and the sdk and svc ship in one package today.

## .where

- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/asDaemonStatusRow.ts`
- `src/domain.operations/keyrack/daemon/sdk/src/domain.operations/daemonAccessStatus.ts`
- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/handleCommands.test.ts`

## .verdict

open — to the commander at the pr.
