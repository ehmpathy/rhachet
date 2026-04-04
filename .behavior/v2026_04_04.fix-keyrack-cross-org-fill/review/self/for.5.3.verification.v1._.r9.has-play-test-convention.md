# self-review: has-play-test-convention (r9)

## the core question

> are journey test files named correctly with `.play.test.ts` suffix?

## step 1: enumerate test files in this PR

**command**: `git status --short` and `git diff main --name-only`

**test files added/modified**:

| file | status | type |
|------|--------|------|
| `asKeyrackKeyOrg.test.ts` | new (untracked) | unit test |
| `fillKeyrackKeys.integration.test.ts` | modified | integration test |

**play/journey tests added**: none.

## step 2: assess if journey test was needed

**the guide asks**:
- are journey tests in the right location?
- do they have the `.play.` suffix?
- if not supported, is the fallback convention used?

**analysis**:

this is a **bug fix**, not a new feature. the fix corrects `fillKeyrackKeys` to use the correct org from the slug when the root manifest extends another manifest with a different org.

**journey test candidates**:

| scenario | journey test needed? | why |
|----------|----------------------|-----|
| cross-org extends fill | no | integration test case8 covers the journey |
| CLI `rhx keyrack fill` | no | acceptance tests cover CLI output, no new CLI behavior |

**why no new journey test**:

1. **integration test case8 is the journey test** — it tests the full path:
   - create root keyrack (org: ahbode)
   - create extended keyrack (org: rhight)
   - call fillKeyrackKeys
   - verify keys stored under correct orgs
   - verify roundtrip verification passes

2. **no new CLI behavior** — the CLI contract `rhx keyrack fill` is unchanged. only the internal org resolution was fixed.

3. **bug fixes inherit journey coverage** — the fix corrects extant behavior. the journey (fill with extends) was already tested; only the cross-org variant was not. case8 fills that gap.

## step 3: verify integration test case8 covers the journey

**file**: `fillKeyrackKeys.integration.test.ts`

**case8 structure** (lines 659-744):

```ts
given('[case8] cross-org extends (root=ahbode, extended=rhight)', () => {
  // setup: create extended keyrack (org: rhight)
  // setup: create root keyrack (org: ahbode, extends rhight)

  when('[t0] fill is called with env=prod', () => {
    then('stores USPTO_ODP_API_KEY under rhight org', async () => {
      // provide mock stdin values
      setMockPromptValues(['db-password-value', 'uspto-key-value']);

      const result = await fillKeyrackKeys({
        env: 'prod',
        owners: ['case8'],
        ...
      });

      // verify both keys set
      expect(result.summary.set).toEqual(2);
      expect(result.summary.failed).toEqual(0);

      // verify slugs show correct orgs
      expect(slugs).toContain('rhight.prod.USPTO_ODP_API_KEY');
      expect(slugs).toContain('ahbode.prod.DB_PASSWORD');
    });
  });
});
```

**journey steps covered**:

| step | covered? | evidence |
|------|----------|----------|
| load manifest with extends | yes | repo setup creates nested manifests |
| hydrate keys from extended manifest | yes | USPTO_ODP_API_KEY from rhight manifest |
| prompt with correct org | yes | slug used in prompt (verified via org assertion) |
| store under correct org | yes | `expect(slugs).toContain('rhight.prod...')` |
| roundtrip verification | yes | `expect(result.summary.failed).toEqual(0)` |

the integration test covers the full journey.

## step 4: verify no `.play.test.ts` convention violation

**search for play tests**:

```bash
git diff main --name-only | grep play
```

**result**: no `.play.test.ts` files in diff.

**search for play tests in codebase**:

this repo uses `.integration.test.ts` for domain operation tests, not `.play.test.ts`. the convention is:
- `.test.ts` = unit tests
- `.integration.test.ts` = integration tests (journey tests for domain operations)
- `.acceptance.test.ts` = acceptance tests (CLI blackbox tests)

the fallback convention is in use. no violation.

## step 5: check if play test convention is supported

**check for play tests in repo**:

```bash
find src -name '*.play.test.ts' -o -name '*.play.integration.test.ts'
```

**result**: no play tests in repo (verified via glob search).

**conclusion**: this repo does not use the `.play.test.ts` convention. it uses `.integration.test.ts` as the fallback for journey tests.

## conclusion

| check | result |
|-------|--------|
| journey test added? | no (not needed) |
| journey coverage adequate? | yes (case8 covers the journey) |
| play test convention used? | n/a (repo uses integration test fallback) |
| convention violation? | no |

no journey test was needed because the integration test case8 covers the full journey. this repo uses `.integration.test.ts` as the fallback convention for journey tests, not `.play.test.ts`. no convention violation.
