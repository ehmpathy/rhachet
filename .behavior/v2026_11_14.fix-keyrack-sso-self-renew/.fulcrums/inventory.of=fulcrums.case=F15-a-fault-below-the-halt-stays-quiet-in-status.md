# F15 — a renew fault below the halt stays quiet in status

## .the fork

i002 r002 nitpick.2: a key that faults on some ticks but never ten in a row shows no signal in `keyrack status`; its faults go to the daemon log, which a spawned daemon sends nowhere.

- **a** — surface `faultCount` on the status row (`renew faults = N`), a new field on `DaemonStatusRow` and a new leaf
- **b** — keep transient faults quiet; a fault streak that reaches ten is named as `halted`

## .taken

b. the vision keeps a blip quiet on purpose (alarm fatigue): a renew that retries and succeeds needs no human. a key that faults on and off still renews between faults, so its consumers keep access; the moment it stops to renew for a full window, the halt names it. a new status field widens the `status --json` contract, which deserves its own decision.

the one field this pr does add to the row, `renew.isAtCap`, passes the test b applies: it changes what a human does next. `renew = off` at the cap tells the human to unlock for more time, where `renew = on` tells them to wait; a fault count below the halt tells them naught they can act on. it is optional, so the json of every other key is unchanged, and its one reader is the cli render in the same package (vision Q8). i001 r010 raised it as a contract that grew without a record; this paragraph is that record.

## .rework

clean: one field on the status row, one leaf, one snapshot family.

## .confidence — 75%, why not higher

an erratic key that never halts is a real signal a human might want, and the reviewer's leaf would be quiet enough not to fatigue.

## .where

- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/renewDaemonGrantsDue.ts`
- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/handleStatusCommand.ts`

## .verdict

open — to the commander at the pr.
