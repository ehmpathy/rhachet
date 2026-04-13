# self-review: has-all-tests-passed

## proof

each test suite ran successfully with the exact commands and outputs documented below.

### types

```
$ npm run test:types
> rhachet@1.39.13 test:types
> tsc -p ./tsconfig.json --noEmit
exit code: 0
```

### lint

```
$ npm run test:lint
> biome check --diagnostic-level=error
Checked 624 files in 853ms. No fixes applied.
Found 0 errors. (after `npm run fix`)
exit code: 0
```

### format

```
$ npm run test:format
exit code: 0
```

### unit

```
$ npm run test:unit
Test Suites: 85 passed, 85 total
Tests:       164 passed, 164 total
exit code: 0
```

### integration

```
$ npm run test:integration
Test Suites: 53 passed, 53 total
Tests:       150 passed, 150 total
exit code: 0
```

## zero failures

no test failures. no extant broken tests. no flaky tests observed.

## fake tests

none. each keyrack test:
- mocks stdin (legitimate — automated tests cannot type)
- uses real filesystem operations
- uses real age encryption via test SSH keys
- verifies actual behavior

## credential handle

the keyrack tests use `createTestHomeWithSshKey` which generates a real SSH keypair for each test run. no credential bypass — encryption/decryption paths are exercised.

## why it holds

all 314 tests (164 unit + 150 integration) pass. type check passes. lint passes. format passes. this was verified as part of the verification stone.

## verdict

✓ all tests pass with proof
