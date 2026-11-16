# F11 — the concrete sso renewal sits behind the tick's injected seam

## .the fork

`getOneSsoGrantRenewal` imports the aws proof and the aws sso mech directly (r005 nitpick.1).

- **a** — add a neutral proof contract between the daemon and the aws adapters
- **b** — keep the concrete renewal; the seam is `getOneRenewal`, injected into the tick

## .taken

b. the wish scopes the renew to aws sso keys; a neutral contract would abstract over one implementation. every tick test runs with a fake `getOneRenewal` and no aws adapter in reach, and the adapters load by lazy import, so a daemon that renews no key never pays for them.

## .rework

clean: a contract type and one adapter behind it.

## .confidence — 85%, why not higher

a second renewable mech (a github app token, say) would want the neutral contract, and then this rework becomes owed.

## .where

- `src/domain.operations/keyrack/daemon/svc/src/domain.operations/getOneSsoGrantRenewal.ts`

## .verdict

open — to the commander at the pr.
