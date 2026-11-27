# F40 — the renewal entry is a noun tree

## .the fork

#759 r4696215528, r4696221703, r4696277090: `mark` is a synonym for status; `renewedCount`, `faultCount`, `mark` lack a noun tree; `renew record` or `renewal record`.

- **a** — `DaemonRenewalEntry { grant, expiresAtMax, status, count: { renewed, faulted }, error }`, `status` ∈ `on | lapsed | halted`
- **b** — `status` as a union that carries its own error: `{ choice: 'halted'; error }`

## .taken

a. `renewal` is the noun and `renew` the verb, so the record, its entries, and the status facet take `renewal`; operations that act keep the verb (`renewDaemonGrantsDue`). the two counts share one head, `count`. `error` keeps the halt's cause at the top level, where `--json` already shows it; b would nest a field a reader looks for first.

## .rework

clean: a field reshape within the daemon, and the wire facet in step.

## .confidence — 75%, why not higher

`error` is meaningful only for `halted`, and a is silent on that in the type.

## .where

- `src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonRenewalRecord.ts`

## .verdict

open — to the commander at the pr.
