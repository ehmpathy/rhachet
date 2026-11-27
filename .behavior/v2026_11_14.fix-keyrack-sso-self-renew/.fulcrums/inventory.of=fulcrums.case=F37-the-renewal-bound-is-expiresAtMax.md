# F37 — the renewal bound is `expiresAtMax`

## .the fork

#759 r4696123128, r4696178127: `cap` is a synonym for expiry. the commander asks `expiresAt: { now, max }?`.

- **a** — nest: `computeExpiresAt` returns `expiresAt: { now, max }`
- **b** — flat: `expiresAtMax` beside the extant `expiresAt`, the same noun tree as one name

## .taken

b. `computeExpiresAt().expiresAt` is extant on main, read by its callers and 20 asserts; a nest churns them all, and r4696257703 asks for no churn of extant code this pr does not touch. `expiresAtMax` keeps `expiresAt` as its head, so it sorts and autocompletes beside it, and it is the one name for the bound in every layer: the unlock wire, the renewal entry, and `computeExpiresAt`.

## .rework

clean: a rename to a nest, one field.

## .confidence — 70%, why not higher

the commander's own sketch is the nest.

## .where

- `src/domain.operations/keyrack/computeExpiresAt.ts`
- `src/domain.objects/keyrack/KeyrackDaemonUnlockRenewal.ts`
- `src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonRenewalRecord.ts`

## .verdict

open — to the commander at the pr.
