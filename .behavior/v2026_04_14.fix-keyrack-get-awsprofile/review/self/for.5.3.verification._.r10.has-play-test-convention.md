# self-review r10: has-play-test-convention

## the check

are journey test files named correctly? does any journey need a `.play.test.ts` journey test?

## step 1: understand play test convention in this repo

```bash
$ glob '**/*.play.test.ts'
(empty — no .play.test.ts files found)

$ glob '**/*.acceptance.test.ts' | wc -l
72 files
```

**this repo does not use `.play.test.ts` convention.** instead, it uses:
- `*.test.ts` — unit tests (collocated with source)
- `*.integration.test.ts` — integration tests (collocated with source)
- `*.acceptance.test.ts` — acceptance/journey tests (in `blackbox/` directory)

the fallback convention for journey tests is `*.acceptance.test.ts` in `blackbox/cli/` or `blackbox/sdk/`.

## step 2: directly answer the guide's questions

### q1: are journey tests in the right location?

**yes.** this repo places journey tests in `blackbox/cli/` for CLI contracts:

```
blackbox/
  cli/
    keyrack.cli.acceptance.test.ts           ← CLI contract journey tests
    keyrack.get.output.acceptance.test.ts    ← output format journey tests
    keyrack.vault.awsIamSso.acceptance.test.ts ← aws sso vault journey tests
    ...
```

the keyrack CLI journey tests are in the correct location.

### q2: do they have the `.play.` suffix?

**no — and that is correct for this repo.** this repo does not use `.play.test.ts` suffix. it uses `.acceptance.test.ts` suffix instead.

verification:
```bash
$ glob '**/*.play.test.ts'
(empty — zero files)
```

### q3: if not supported, is the fallback convention used?

**yes.** the repo uses `*.acceptance.test.ts` as its fallback convention for journey tests. all 72 journey test files follow this convention.

## step 3: does THIS fix need a new journey test?

**no.** the fix:
- modifies an **internal adapter** (`domain.operations/keyrack/adapters/vaults/aws.config/`)
- does **not** modify any public contract (`src/contract/`)
- does **not** change CLI output format
- does **not** add new user-visible behavior

the fix corrects the **return value** of an internal adapter method. the user journey (`rhx keyrack get --key AWS_PROFILE --env test`) is already covered by:

1. **unit test [t0.5]** — proves `vaultAdapterAwsConfig.get()` returns profile name
2. **integration test** — proves real AWS SSO profile lookup returns profile name
3. **extant acceptance tests** — `keyrack.vault.awsIamSso.acceptance.test.ts` covers aws.config vault behavior

## step 4: verify test file conventions for this fix

| file | convention | correct? |
|------|------------|----------|
| `vaultAdapterAwsConfig.test.ts` | `*.test.ts` for unit | yes |
| `vaultAdapterAwsConfig.integration.test.ts` | `*.integration.test.ts` for integration | yes |

both test files follow repo conventions. no new acceptance test file was added because the fix is internal and extant acceptance tests cover the CLI contract.

## why it holds

1. **repo uses `.acceptance.test.ts` not `.play.test.ts`** — `glob '**/*.play.test.ts'` returns empty, 72 `.acceptance.test.ts` files found
2. **journey tests are in correct location** — `blackbox/cli/` for CLI contracts, `blackbox/sdk/` for SDK contracts
3. **fallback convention is used correctly** — `*.acceptance.test.ts` is the repo's standard for journey tests
4. **fix is internal adapter** — not a user-faced contract, no new journey test needed
5. **extant tests cover the journey** — unit, integration, and acceptance tests prove the fix works
6. **test names are correct** — `*.test.ts` for unit, `*.integration.test.ts` for integration

the guide's three questions are all answered "yes": journey tests are in the right location, they use the repo's fallback convention (`.acceptance.test.ts`), and this fix does not need a new journey test because extant tests cover the behavior.

