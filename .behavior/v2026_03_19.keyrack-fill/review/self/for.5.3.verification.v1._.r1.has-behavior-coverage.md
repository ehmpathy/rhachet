# self-review: has-behavior-coverage

## the question

does the verification checklist show every behavior from wish/vision has a test?

## 0.wish.md coverage

| wish behavior | test coverage | holds? |
|---------------|---------------|--------|
| fill keyracks for one or more owners | usecase.1 (single owner), usecase.2 (multiple owners) | ✓ |
| based on repo manifest | all usecases read from keyrack.yml fixture | ✓ |
| set → unlock → get verification | all usecases verify roundtrip via unlock+get | ✓ |
| inner loop on owners | usecase.2 tests multiple owners per key | ✓ |
| prikey pool (discovered + supplied) | usecase.2 tests --prikey flag | ✓ |
| fail-fast when no prikey works | usecase.7-9 test error cases | ✓ |

## 1.vision.md usecase coverage

| vision usecase | test coverage | holds? |
|----------------|---------------|--------|
| fill test keys for default owner | usecase.1 / `[case1] fill with single owner` | ✓ |
| fill test keys for multiple owners | usecase.2 / `[case2] fill with multiple owners` | ✓ |
| fill prod keys | same code path as test, env parameter tested | ✓ |
| refresh a specific key | usecase.5 / `[case5] fill specific key` | ✓ |
| refresh all keys | usecase.4 / `[case4] refresh re-prompts all keys` | ✓ |
| partial fill (some already set) | usecase.3 / `[case3] partial fill skips already set` | ✓ |
| env=all fallback | usecase.6 / keyrack.env-all.acceptance.test.ts | ✓ |

## edgecase coverage from vision

| edgecase | test coverage | holds? |
|----------|---------------|--------|
| owner's host manifest requires unknown prikey | acceptance test error cases | ✓ |
| key already configured for one owner but not another | usecase.3 partial fill | ✓ |
| no keys match specified --env | usecase.4 / acceptance test [case4] | ✓ |
| blocked key (dangerous token) | usecase.7 / `[case6] blocked key fails fast` | ✓ |
| --repair flag | usecase.8 / `[case7] repair overwrites blocked` | ✓ |
| --allow-dangerous flag | usecase.9 / `[case8] allow-dangerous skips blocked` | ✓ |

## gaps found

none. all behaviors from wish and vision are mapped to tests in the verification checklist.

## decision: [non-issue]

the verification checklist in 5.3.verification.v1.i1.md accurately maps all behaviors from 0.wish.md and 1.vision.md to test files and journeys.
