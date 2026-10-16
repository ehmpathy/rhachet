# F16 — the unlock orchestrator test fakes its vaults; each vault has its own real suite

**the fork** — `unlockKeyrackKeys.integration.test.ts` hands `genMockVaultAdapter()` for the vaults a
case does not exercise. (a) wire every real vault into the orchestrator suite · (b) keep the fakes
there, and verify each external contract in the vault's own integration suite.

**taken** — (b). the orchestrator's subject is the sweep: which keys it asks for, under which org, and
what it hands back. a case that reads one key from `os.direct` needs no real `aws.params` or 1password
call, and a real call there would make the suite need every credential at once for no new fact. the
external contracts are each verified against the real service where they live:

- `1password/vaultAdapter1Password.integration.test.ts` — the real `op` cli (ci installs it)
- `aws.config/vaultAdapterAwsConfig.integration.test.ts`, `aws.params/*.integration.test.ts` — real aws
- `github.secrets/ghSecretSet.real.integration.test.ts`, `vaultAdapterGithubSecrets.integration.test.ts`
- `os.direct`, `os.secure`, `os.daemon` — each its own `vaultAdapter*.integration.test.ts`

this diff adds no new external contract; it changes which org a sweep names, which the orchestrator
suite asserts.

**the counter** — a fake in an integration suite can drift from the adapter it stands in for. true; the
fake shape is the `KeyrackHostVaultAdapter` interface the real adapters compile against, so a shape
drift is a type error.

**rework** — clean. a fake per case can be swapped for the real adapter by name.

**confidence** — 85%.

**where** — `src/domain.operations/keyrack/session/unlockKeyrackKeys.integration.test.ts`, each `genMockVaultAdapter()` call.

**verdict** — open.
