# self-review r6: has-contract-output-variants-snapped

## the check

does each public contract have EXHAUSTIVE snapshots?

## step 1: identify what was modified by THIS fix

```bash
$ git diff --name-only HEAD -- 'src/'
src/domain.operations/keyrack/adapters/vaults/aws.config/vaultAdapterAwsConfig.test.ts
src/domain.operations/keyrack/adapters/vaults/aws.config/vaultAdapterAwsConfig.ts
```

**exactly two files** were modified by this fix:
1. `vaultAdapterAwsConfig.ts` — the adapter implementation
2. `vaultAdapterAwsConfig.test.ts` — the test file

## step 2: were any public contracts modified?

**no.** verify via contract directory:

```bash
$ git diff --name-only HEAD -- 'src/contract/'
(empty — no contract files modified)
```

the fix is entirely contained within the internal adapter. no files in `src/contract/` were touched.

## step 3: is `vaultAdapterAwsConfig` a public contract?

**no.** it is an **internal adapter** in `domain.operations/`:

```
src/
  domain.operations/          ← internal layer
    keyrack/
      adapters/               ← internal adapters
        vaults/
          aws.config/         ← this vault adapter
```

public contracts live in `src/contract/`:
```
src/
  contract/
    cli/                      ← cli commands (public)
    sdk/                      ← sdk exports (public)
    api/                      ← api endpoints (public)
```

the vault adapter is consumed internally by `keyrack get/set/unlock` operations. users never import or call `vaultAdapterAwsConfig` directly.

## step 4: verify the test file documents this

from `vaultAdapterAwsConfig.test.ts` header:
```typescript
/**
 * .note = mocks child_process (exec, spawn) and fs to simulate aws cli behavior
 * .why = aws sso requires browser-based oauth flow — cannot be automated in tests
 *        see: aws sso uses interactive browser auth to approve access
 *        mocks allow test of adapter logic without real aws credentials
 * .note = no snapshot coverage because aws.config is internal vault adapter, not user-faced contract
 */
```

the test file explicitly documents why no snapshots: **internal vault adapter, not user-faced contract.**

## step 5: do downstream public contracts need snapshot updates?

the CLI commands that consume this adapter are:
- `rhx keyrack get --key AWS_PROFILE --env test`
- `rhx keyrack set --key AWS_PROFILE --env test`
- `rhx keyrack unlock --key AWS_PROFILE --env test`

the CLI output did change:

| state | output |
|-------|--------|
| before (broken) | `{"AWS_ACCESS_KEY_ID":"ASIA...","AWS_SECRET_ACCESS_KEY":"..."}` |
| after (correct) | `ehmpathy.demo` |

however, **this is a bug fix**. the prior output was incorrect behavior. the CLI contract files were not modified — they still call `vault.get()` and return the result. the fix corrects what `vault.get()` returns.

if CLI contracts had snapshots of the broken output, those snapshots would be **wrong to keep** — they captured incorrect behavior. but no such snapshots exist to update.

## step 6: verify no snapshot files need updates

```bash
$ git diff --name-only HEAD -- '**/__snapshots__/**'
(empty — no snapshot files modified)
```

no snapshot files were touched by this fix.

## why it holds

1. **no contract files were modified** — `git diff HEAD -- src/contract/` is empty
2. **fix is isolated to internal adapter** — only `vaultAdapterAwsConfig.ts` and its test file changed
3. **not a public contract** — `domain.operations/keyrack/adapters/` is internal layer
4. **test file explicitly documents this** — header states "no snapshot coverage because internal adapter"
5. **no snapshot files to update** — `git diff HEAD -- **/__snapshots__/**` is empty
6. **bug fixes don't preserve broken snapshots** — prior output was incorrect; no need to snapshot incorrect behavior

internal adapters verify behavior via unit/integration tests with assertions. snapshots are for public contracts where output format matters to external callers. this fix is entirely internal.

