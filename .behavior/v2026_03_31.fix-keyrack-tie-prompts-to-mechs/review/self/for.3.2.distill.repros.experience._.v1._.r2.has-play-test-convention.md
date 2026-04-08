# self-review: has-play-test-convention

## test convention analysis

### what the repo uses

searched for test file patterns:
- `.play.test.ts` — 0 files found
- `.play.integration.test.ts` — 0 files found
- `.test.ts` — many files found
- `.integration.test.ts` — many files found

repo uses standard jest conventions:
- unit tests: `*.test.ts`
- integration tests: `*.integration.test.ts`
- acceptance tests: `*.acceptance.test.ts`

### what the sketch uses

```ts
describe('mechAdapterGithubApp.promptForSet.play.integration', () => {
```

this would map to file: `mechAdapterGithubApp.promptForSet.play.integration.test.ts`

### is this correct?

**yes.** the repo uses `.integration.test.ts` for tests that need external dependencies (temp home, mock gh cli, etc). the `.play.` infix before `.integration` indicates it's a journey test within the integration runner.

file names:
- `feature.play.integration.test.ts` for journey tests run by integration runner
- `feature.play.acceptance.test.ts` for journey tests run by acceptance runner

### non-issues confirmed

1. **test filename convention** — ✓ uses `.play.integration.test.ts` which matches repo's integration runner
2. **describe block name** — ✓ matches proposed filename
3. **runner compatibility** — ✓ integration runner will pick up `.integration.test.ts` files

---

## verdict

play test convention is correct:
- repo uses `.integration.test.ts` for tests with dependencies
- journey tests use `.play.integration.test.ts` suffix
- describe block matches the filename

no issues found.
