# self-review r4: has-play-test-convention (deep reflection)

## the question

are journey tests named correctly?

the guide says:
- `.play.test.ts` — journey test
- `.play.integration.test.ts` — if repo requires integration runner

---

## test sketch examination

### what the sketch shows

```ts
describe('mechAdapterGithubApp.promptForSet.play.integration', () => {
  const tempHome = withTempHome({ name: 'github-app-test' });
  beforeAll(tempHome.setup);
  afterAll(tempHome.teardown);

  beforeEach(() => {
    // mock gh cli
    (execSync as jest.Mock)
      .mockReturnValueOnce(...)
  });

  given('[case1] user sets github app key', () => {
    when('[t0] before any changes', () => {
      then('key is absent', async () => {
        ...
      });
    });
```

### what holds

| aspect | holds? | why |
|--------|--------|-----|
| suffix `.play.integration` | ✓ | repo uses `.integration.test.ts` runner |
| BDD structure | ✓ | uses `given/when/then` from test-fns |
| step labels | ✓ | `[t0]`, `[t1-t4]`, `[t5]` timeline markers |
| temp home | ✓ | isolates HOME for keyrack config |

### what could improve (not issues, suggestions)

| aspect | observation |
|--------|-------------|
| file location | not specified in sketch — should be collocated with mech adapter code |
| `beforeEach` vs `useBeforeAll` | uses `beforeEach` for mocks — acceptable for mock reset |

---

## file location

the test should be collocated with the mech adapter:

```
src/domain.operations/keyrack/mech/
  ├─ mechAdapterGithubApp.ts
  ├─ mechAdapterGithubApp.test.ts (unit)
  └─ mechAdapterGithubApp.promptForSet.play.integration.test.ts (journey)
```

this is not an issue in the convention — it's an implementation detail for later.

---

## non-issues confirmed (why they hold)

1. **`.play.integration` suffix** — holds because repo's jest config runs `.integration.test.ts` files. the `.play.` infix distinguishes journey tests from data-driven integration tests.

2. **BDD structure** — holds because test sketch uses `given/when/then` which is the repo's standard BDD pattern from test-fns.

3. **step labels** — holds because `[t0]`, `[t1-t4]`, `[t5]` match the journey step table format in the experience reproductions document.

4. **timeline progression** — holds because steps follow a coherent user journey: before → guided setup → unlock.

---

## verdict

play test convention is correct:
- suffix `.play.integration.test.ts` matches repo runner
- BDD structure with step labels matches repo patterns
- file location is an implementation detail (not a convention issue)

no issues found.
