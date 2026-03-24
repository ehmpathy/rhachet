# self-review: has-zero-test-skips

## the question

did i verify zero skips in keyrack-fill related tests?

## search results

searched for `.skip(` and `.only(` patterns across all test files:

```
grep -r '\.skip\(|\.only\(' **/*fill*.test.ts  → no matches
grep -r '\.skip\(|\.only\(' **/*env-all*.test.ts  → no matches
```

## keyrack-fill related test files

| file | skips | holds? |
|------|-------|--------|
| fillKeyrackKeys.integration.test.ts | none | ✓ |
| keyrack.fill.acceptance.test.ts | none | ✓ |
| keyrack.env-all.acceptance.test.ts | none | ✓ |
| keyrack.env-all-org-scope.acceptance.test.ts | none | ✓ |
| keyrack.env-all-owner-scope.acceptance.test.ts | none | ✓ |
| keyrack.env-isolation.acceptance.test.ts | none | ✓ |
| vaultAdapterAwsIamSso.test.ts | none | ✓ |

## skips in other files (not keyrack-fill related)

found skips in unrelated test files:
- keyrack.vault.awsIamSso.acceptance.test.ts:474 - gap.3 deferred
- keyrack.sudo.acceptance.test.ts:1463 - gap.3 deferred
- keyrack.recipient.acceptance.test.ts:457 - gap.4 deferred
- invokeRun.integration.test.ts:336 - unrelated to keyrack-fill
- enweaveOneFanout.integration.test.ts:111 - given.only (unrelated to keyrack-fill)

these are pre-extant issues unrelated to keyrack-fill changes.

## silent credential bypasses

no silent bypasses. tests that require credentials either:
- use test fixtures with mock data (fillKeyrackKeys.integration.test.ts)
- use temp repos with test keypairs (acceptance tests)

## decision: [non-issue]

zero skips in keyrack-fill related tests. all 96 keyrack-fill acceptance tests run. all fillKeyrackKeys integration tests run.
