# self-review r2: has-play-test-convention

## verification: journey test convention

### examined: what test file patterns does this repo use?

checked repo test files:
- `.test.ts` — unit tests (e.g., `schema.test.ts`, `hydrateKeyrackRepoManifest.test.ts`)
- `.integration.test.ts` — integration tests (e.g., `index.integration.test.ts`, `invokeAct.integration.test.ts`)
- `.play.test.ts` — not found in repo

the repo does not currently use `.play.test.ts` suffix.

### examined: what should journey tests for keyrack fill use?

the journey tests for fillKeyrackKeys will:
- mock daoKeyrackRepoManifest to return test manifest
- mock daoKeyrackHostManifest to simulate empty/partial/full state
- mock promptHiddenInput to return test values
- invoke the fillKeyrackKeys operation

this requires mocked dependencies, which makes them integration tests in this repo's convention.

### decision: use `.play.integration.test.ts`

per the guide:
> if the repo doesn't support `.play.test.ts` directly, plan to use
> `.play.integration.test.ts` or `.play.acceptance.test.ts` instead.

the keyrack fill journey tests will use:
```
fillKeyrackKeys.play.integration.test.ts
```

this:
- distinguishes journey tests (step-by-step experience) from other integration tests
- runs with the integration test runner (`npm run test:integration`)
- follows the `.play.` convention for journey tests

### test file plan

| journey | test file |
|---------|-----------|
| fill all keys for default owner | `fillKeyrackKeys.play.integration.test.ts` |
| fill all keys for multiple owners | same file, separate given block |
| partial fill | same file, separate given block |
| fail-fast: no prikey | same file, error case given block |

all journeys can live in one test file since they test the same operation with different scenarios.

---

## conclusion

convention decided: `.play.integration.test.ts` for journey tests.

no issues found. the experience reproduction document test sketch aligns with this convention.
