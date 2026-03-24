# self-review r3: has-play-test-convention

## deeper reflection on journey test convention

i re-read the experience reproduction document. i questioned the test sketch and the file pattern decision.

### examined: does the test sketch match the `.play.` convention?

the test sketch in the experience reproduction shows:

```ts
describe('fillKeyrackKeys', () => {
  given('[case1] repo manifest with 2 keys, owner=default', () => {
    // setup
    when('[t0] before fill', () => { ... });
    when('[t1] fillKeyrackKeys is called', () => { ... });
  });
});
```

this follows the journey test pattern:
- `given` establishes the scenario
- `when` with temporal labels (`[t0]`, `[t1]`) walks through steps
- assertions verify state at each step

**verdict: holds.** the sketch follows journey test conventions.

### examined: why `.play.integration.test.ts` and not `.play.test.ts`?

i checked the jest config to understand test file patterns:

```
npm run test:unit -- matches *.test.ts (not *.integration.test.ts)
npm run test:integration -- matches *.integration.test.ts
```

the fillKeyrackKeys journey tests require:
1. mocked daoKeyrackRepoManifest (to return test manifest)
2. mocked daoKeyrackHostManifest (to simulate state)
3. mocked promptHiddenInput (to return test values)

these mocks require jest.mock() at module level, which is standard for integration tests in this repo.

if we used `.play.test.ts`, it would run with unit tests but require integration-style mocks — a mismatch.

**verdict: holds.** `.play.integration.test.ts` aligns with repo conventions.

### examined: could the tests be pure unit tests instead?

alternative: extract the fill orchestration logic into a pure function that accepts already-loaded manifests and a value supplier. then the journey tests could be unit tests.

```ts
// pure orchestration
const fillKeysFromManifest = (
  input: { keys: Key[]; owners: string[] },
  context: { getValue: () => string; setKey: ...; unlockKey: ...; getKey: ... }
) => { ... }
```

**verdict: not worth it for v1.** the fill command's value is orchestration of DAO calls. to extract pure logic would create an artificial seam. accept the integration test pattern.

### examined: what about acceptance tests?

the CLI contract `rhx keyrack fill` could have blackbox acceptance tests that invoke the binary.

**verdict: out of scope for this stone.** this stone is about the domain operation `fillKeyrackKeys`. CLI acceptance tests would be a separate concern, tested via `invokeKeyrack.acceptance.test.ts`.

### test file structure confirmed

| test type | file | what it tests |
|-----------|------|---------------|
| journey (integration) | `fillKeyrackKeys.play.integration.test.ts` | step-by-step fill scenarios with mocked DAOs |
| unit | `fillKeyrackKeys.test.ts` | isolated helper functions if any |
| cli acceptance | `invokeKeyrack.acceptance.test.ts` | blackbox CLI invocation |

---

## conclusion

the `.play.integration.test.ts` convention holds because:
1. journey tests need mocked DAOs (integration test pattern)
2. the repo's jest config separates unit from integration by filename
3. the `.play.` infix distinguishes journey from standard integration tests
4. the test sketch in the experience reproduction follows journey conventions

no issues found.
