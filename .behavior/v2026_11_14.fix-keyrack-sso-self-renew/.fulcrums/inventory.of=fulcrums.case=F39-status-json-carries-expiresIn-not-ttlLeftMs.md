# F39 — `keyrack status --json` carries `expiresIn`, never `ttlLeftMs`

## .the fork

#759 r4696241582 suggests `expiresIn: IsoDuration | null` in place of `ttlLeftMs: number | null`. the field is part of the public `keyrack status --json` payload on main.

- **a** — replace it, as suggested; the cli derives `expiresIn` from `expiresAt` when an older daemon sends none
- **b** — add `expiresIn`, keep `ttlLeftMs` as deprecated

## .taken

a. the commander's suggestion is a replace. a search of every `ehmpathy/*` repo finds no code that reads `ttlLeftMs` outside rhachet itself (briefs only). b keeps the bare-number field the commander called out, in the very payload a human reads.

## .rework

clean: one field, its cast, and the masks in three acceptance suites.

## .confidence — 75%, why not higher

a consumer outside the org may parse the json; none is known.

## .where

- `src/domain.operations/keyrack/daemon/sdk/src/domain.operations/daemonAccessStatus.ts`
- `src/domain.operations/keyrack/session/asKeyrackStatusKey.ts`

## .verdict

open — to the commander at the pr.
