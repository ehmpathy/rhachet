# F10 — no prod contract widens for a test's convenience

## .the fork

`daemonSsoRenew.integration.test.ts` sets mock knobs on `process.env` before it spawns a daemon, since `spawnKeyrackDaemonBackground` passes `process.env` to the child (r001 nitpick.2).

- **a** — add an `env` input to `spawnKeyrackDaemonBackground`, used by the test alone
- **b** — keep the prod spawn as is; the test restores each key it sets, by name

## .taken

b. in prod the daemon reads the env of the cli that spawned it, and that is the path worth proof: the acceptance journey `keyrack.status.renew` passes its knobs through the cli and never touches `process.env`. the knobs are mock settings, no credential, so the ambient-creds rule's harm does not apply.

## .rework

clean: one optional input on the spawn and one call site.

## .confidence — 85%, why not higher

a later suite in the same jest worker could read a key mid-suite; the restore runs at `afterAll`, not per case.

## .where

- `src/domain.operations/keyrack/daemon/daemonSsoRenew.integration.test.ts`

## .verdict

open — to the commander at the pr.
