# self-review: has-play-test-convention (round 9)

## what i must verify

are journey test files named correctly per the `.play.test.ts` convention?

## verification

### search for journey tests

```
glob: **/*fillKeyrackKeys*.test.ts
result: src/domain.operations/keyrack/fillKeyrackKeys.integration.test.ts
```

### search for extant play tests in repo

```
glob: **/*.play.*.ts
result: no files found
```

### analysis

this repo does not use the `.play.test.ts` convention. there are zero `.play.` files in the entire codebase.

the repo uses the standard convention:
- `.test.ts` for unit tests
- `.integration.test.ts` for integration tests
- `.acceptance.test.ts` for acceptance tests

the journey test file `fillKeyrackKeys.integration.test.ts` follows the repo's convention.

## decision: [convention satisfied via fallback]

the `.play.test.ts` convention is not used in this repo.

the fallback convention (`.integration.test.ts`) is used consistently.

the journey test file is correctly named per repo convention:
- `src/domain.operations/keyrack/fillKeyrackKeys.integration.test.ts`

no action needed.
