# F38 — the status wire type is `DaemonStatusKey`

## .the fork

#759 r4696251704 bans the term `row`; r4696257703 asks for no churn of extant code this pr does not touch. `DaemonStatusRow` is extant on main, but this pr edits its declaration; `DaemonKeyRow` (GET) is extant and untouched.

- **a** — rename `DaemonStatusRow` → `DaemonStatusKey`; leave `DaemonKeyRow` until a pr touches it
- **b** — keep `DaemonStatusRow`, rename only the operations this pr added

## .taken

a. the reply is `{ keys: [...] }`, so each element is a key. b would leave `asDaemonStatusKey` to return a `DaemonStatusRow`, two nouns for one concept. the type's file is in this pr, so the rename is in scope; `DaemonKeyRow` is not.

## .rework

clean: one type rename and its importers.

## .confidence — 75%, why not higher

`DaemonKeyRow` and `DaemonStatusKey` now differ in noun for twin concepts until a pr touches GET.

## .where

- `src/domain.operations/keyrack/daemon/sdk/src/domain.operations/daemonAccessStatus.ts`

## .verdict

open — to the commander at the pr.
