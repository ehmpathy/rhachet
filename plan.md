# plan: remove KEYRACK_IDENTITY + relocate acceptance tests

## problem

two violations:

1. **10 acceptance tests live in `src/contract/cli/keyrack/`** — acceptance tests are blackbox and must live in `accept.blackbox/`. these tests also use `invokeRhachetCli` (runs TS source via `npx tsx`) instead of `invokeRhachetCliBinary` (runs compiled binary), so they aren't true blackbox tests.

2. **`KEYRACK_IDENTITY` env var used as identity shortcut** — bypasses the blueprint's recipient-based identity discovery flow. `discoverIdentityForRecipient.ts` exists and is fully implemented but is **never called** in prod code. instead, `daoKeyrackHostManifest` has its own brute-force `getAllAvailableIdentities()`, and both it and `vaultAdapterOsSecure` check `process.env.KEYRACK_IDENTITY` as a fallback.

---

## phase 1: wire up recipient-based discovery in prod code

### 1a. `src/access/daos/daoKeyrackHostManifest/index.ts`

- remove `process.env.KEYRACK_IDENTITY` from `getExplicitIdentity()`
- replace or augment `getAllAvailableIdentities()` with a call to `discoverIdentityForRecipient()` — pass manifest recipients from the encrypted file header, match against ssh-agent and standard paths
- keep `input.prikey` as explicit fallback (CLI `--prikey` flag)
- keep `sessionIdentity` as in-memory cache (avoids re-discovery on subsequent ops)

### 1b. `src/domain.operations/keyrack/adapters/vaults/vaultAdapterOsSecure.ts`

- remove `process.env.KEYRACK_IDENTITY` from `getActiveIdentity()`
- identity for os.secure should come from the session identity set by manifest decrypt (already synced via `setOsSecureSessionIdentity()` in `genKeyrackHostContext`)
- if no session identity: error with helpful message (manifest must be unlocked first)

### 1c. verify `discoverIdentityForRecipient.ts` is complete

- confirm it checks ssh-agent keys, standard ssh paths, and age standard locations
- confirm it accepts `recipients: KeyrackKeyRecipient[]` from manifest
- add any absent edge case coverage

### 1d. tests

- update `daoKeyrackHostManifest.integration.test.ts` — remove KEYRACK_IDENTITY usage, verify auto-discovery works
- update `vaultAdapterOsSecure` tests — remove KEYRACK_IDENTITY usage
- add/update `discoverIdentityForRecipient` unit tests if needed

---

## phase 2: remove KEYRACK_IDENTITY from blackbox tests

### 2a. `accept.blackbox/.test/infra/genTestTempRepo.ts`

- stop return of `identity: TEST_AGE_IDENTITY` from the result
- the test SSH key is already copied to `HOME/.ssh/id_ed25519` via `setupTestSshKey()` — auto-discovery will find it

### 2b. update all blackbox test files

remove `KEYRACK_IDENTITY` from env in all invocations across:
- `keyrack.daemon.acceptance.test.ts`
- `keyrack.sudo.acceptance.test.ts`
- `keyrack.envs.acceptance.test.ts`
- `keyrack.set.acceptance.test.ts` (if applicable)
- any other files that reference it

the tests already set `HOME` to the temp repo path which has `.ssh/id_ed25519` — auto-discovery via `getAllAvailableIdentities()` (or `discoverIdentityForRecipient`) will find the key.

### 2c. important: stanza compatibility

the test fixture manifests are encrypted to `TEST_AGE_RECIPIENT` (native `age1...` key). for auto-discovery to work, the test SSH key must produce the same age recipient when converted. verify:
- `sshPubkeyToAgeRecipient(TEST_SSH_PUBKEY)` === `TEST_AGE_RECIPIENT`
- if they don't match: `genTestTempRepo` must re-encrypt manifests to the SSH key's age recipient (not the hardcoded `TEST_AGE_RECIPIENT`)

this is the critical compatibility check. if the SSH test key and the age test key are different keypairs (likely), then `genTestTempRepo.convertLegacyManifest()` must encrypt to the SSH key's recipient instead.

---

## phase 3: move acceptance tests from src/ to accept.blackbox/

### 3a. move 10 files

```
src/contract/cli/keyrack/keyrack.init.acceptance.test.ts        → accept.blackbox/cli/keyrack.init.acceptance.test.ts (merge or rename if collision)
src/contract/cli/keyrack/keyrack.recipient.acceptance.test.ts   → accept.blackbox/cli/keyrack.recipient.acceptance.test.ts (merge or rename)
src/contract/cli/keyrack/keyrack.sudo-lifecycle.acceptance.test.ts → accept.blackbox/cli/keyrack.sudo.acceptance.test.ts (merge)
src/contract/cli/keyrack/keyrack.crossorg.acceptance.test.ts    → accept.blackbox/cli/keyrack.crossorg.acceptance.test.ts
src/contract/cli/keyrack/keyrack.ossecure.acceptance.test.ts    → accept.blackbox/cli/keyrack.ossecure.acceptance.test.ts
src/contract/cli/keyrack/keyrack.owner.acceptance.test.ts       → accept.blackbox/cli/keyrack.owner.acceptance.test.ts
src/contract/cli/keyrack/keyrack.regular.acceptance.test.ts     → accept.blackbox/cli/keyrack.regular.acceptance.test.ts
src/contract/cli/keyrack/keyrack.relock.acceptance.test.ts      → accept.blackbox/cli/keyrack.relock.acceptance.test.ts
src/contract/cli/keyrack/keyrack.security.acceptance.test.ts    → accept.blackbox/cli/keyrack.security.acceptance.test.ts
src/contract/cli/keyrack/keyrack.status.acceptance.test.ts      → accept.blackbox/cli/keyrack.status.acceptance.test.ts
```

note: `keyrack.init.acceptance.test.ts` and `keyrack.recipient.acceptance.test.ts` already exist in `accept.blackbox/cli/` — merge the content or deduplicate.

### 3b. rewrite to use blackbox invoker

each moved test must:
- replace `import { invokeRhachetCli } from '@src/.test/infra'` with `import { invokeRhachetCliBinary } from '../.test/infra/invokeRhachetCliBinary'`
- replace `invokeRhachetCli({ args, cwd })` with `invokeRhachetCliBinary({ args, cwd, env: { HOME: ... } })`
- replace `createTestHomeWithSshKey` with `genTestTempRepo` (or keep ssh key setup but pass HOME via env)
- replace `process.env.HOME = ...` mutations with explicit `env: { HOME: path }` on each invocation (blackbox tests should not mutate process.env)
- replace `@src/` imports with relative imports from `accept.blackbox/.test/`

### 3c. delete originals

remove `src/contract/cli/keyrack/` directory after move is complete.

---

## execution order

1. **phase 1 first** — wire up discovery in prod code, remove KEYRACK_IDENTITY from prod
2. **phase 2 second** — update blackbox tests (depends on phase 1 flow)
3. **phase 3 last** — move and rewrite acceptance tests (depends on phase 2 patterns as solid reference)

each phase should be verified with test runs before the next phase.

---

## risk: stanza mismatch (phase 2c)

the biggest risk is that `TEST_AGE_IDENTITY`/`TEST_AGE_RECIPIENT` (hardcoded age keypair) and the test SSH key (`test_key_ed25519`) are **different keypairs**. if so, manifests encrypted to `TEST_AGE_RECIPIENT` cannot be decrypted by the SSH key.

mitigation: update `genTestTempRepo` to encrypt test fixtures to the SSH key's age recipient (derived via `sshPubkeyToAgeRecipient`). this aligns the test infra with the production flow.
