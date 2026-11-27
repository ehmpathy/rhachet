# F9 — the tick's process boundary logs a defect the record already names

## .the fork

the renew tick runs in a `setInterval` callback. a defect thrown from a renew now marks its entry `halted` with `defect: <message>`, then rethrows, and reaches the tick's `.catch`.

- **a** — rethrow at the tick (r002 nitpick.1): an unhandled rejection ends the daemon process
- **b** — log at the tick and keep the process alive; the defect is already visible in `keyrack status` by its mark

## .taken

b. the daemon holds every caller's unlocked keys in memory; to end it on one key's defect evicts all of them, the outage the renew exists to prevent. the defect does not hide: the mark names it, and `keyrack status` renders it (acceptance `keyrack.status.renew` [t1]).

## .rework

clean: one `.catch` in `scheduleDaemonRenewTick.ts`.

## .confidence — 85%, why not higher

a defect outside any entry (in the tick's own selection code) has no entry to mark, so it reaches only the daemon log, which a spawned daemon sends to no one (`stdio: 'ignore'`).

## .where

- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/scheduleDaemonRenewTick.ts`

## .verdict

revised under peer review i001 (r002 blocker.1, r006 nitpick.2): the gap named in .confidence is closed. the tick's `.catch` now calls `setAllRenewEntriesHaltedByDefect`, so a defect outside any one entry marks every unmarked entry `halted` with `defect <class>: <message>`, and `keyrack status` names it. the process still stays alive (b holds); the log line stays as a second trace.
