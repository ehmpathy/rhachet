# self-review r3: has-play-test-convention (verified)

## repo test conventions

### found via glob search

| pattern | count | used for |
|---------|-------|----------|
| `*.test.ts` | many | unit tests |
| `*.integration.test.ts` | many | integration tests |
| `*.acceptance.test.ts` | some | acceptance tests |
| `*.play.test.ts` | 0 | not used directly |
| `*.play.integration.test.ts` | 0 | new pattern |

### repo does not support `.play.test.ts` directly

verified: no jest config for a separate "play" runner.

jest uses `.integration.test.ts` for integration, `.acceptance.test.ts` for acceptance.

**conclusion:** must use `.play.integration.test.ts` suffix for journey tests in this repo.

---

## test sketch verification

### sketch from document

```ts
describe('mechAdapterGithubApp.promptForSet.play.integration', () => {
  const tempHome = withTempHome({ name: 'github-app-test' });
  beforeAll(tempHome.setup);
  afterAll(tempHome.teardown);
  ...
```

### proposed filename

`mechAdapterGithubApp.promptForSet.play.integration.test.ts`

### does this match the convention?

| check | result | why |
|-------|--------|-----|
| ends in `.test.ts` | ✓ | jest will find it |
| includes `.integration` | ✓ | integration runner will run it |
| includes `.play` | ✓ | distinguishes from unit/data tests |
| describe matches filename | ✓ | `mechAdapterGithubApp.promptForSet.play.integration` |

---

## why `.play.` infix?

the `.play.` infix signals this test is:
1. a journey test (not unit or data-driven)
2. follows given/when/then structure with timeline steps
3. tests user experience, not internal logic

without `.play.`, a file like `mechAdapterGithubApp.promptForSet.integration.test.ts` could be confused with a standard integration test.

---

## non-issues confirmed

1. **test suffix** — ✓ `.play.integration.test.ts` matches repo convention
2. **describe block** — ✓ matches proposed filename
3. **runner compatibility** — ✓ integration runner picks up `.integration.test.ts`
4. **journey test distinction** — ✓ `.play.` infix distinguishes from unit tests

---

## verdict

play test convention is correct:
- repo requires `.integration.test.ts` for tests with dependencies
- `.play.` infix is added to signal journey test
- final format: `feature.play.integration.test.ts`

no issues found.
