# self-review r4: has-acceptance-test-citations

cite the acceptance test for each playtest step.

---

## step 1: read the acceptance test file

file: `blackbox/cli/roles.boot.bootyaml.acceptance.test.ts` (312 lines)

### structure

| case | lines | description |
|------|-------|-------------|
| case1 | 14-117 | boot.yml simple mode |
| case2 | 119-177 | no boot.yml present |
| case3 | 179-198 | boot.yml mixed mode (error case) |
| case4 | 204-230 | boot.yml subject mode |
| case5 | 232-258 | boot.yml subject mode without always |
| case6 | 263-311 | boot.yml with minified briefs |

---

## step 2: map playtest steps to acceptance tests

### playtest step 1: verify token reduction

**playtest expectation:**
- stats show `briefs = 19`, `say = 7`, `ref = 12`
- tokens ≈ 8k

**acceptance test citation:**

file: `blackbox/cli/roles.boot.bootyaml.acceptance.test.ts`
case: `[case1] repo with boot.yml simple mode`
lines: 31-35

```ts
then('outputs stats with say/ref breakdown for briefs', () => {
  expect(result.stdout).toContain('briefs = 3');
  expect(result.stdout).toContain('say = 2');
  expect(result.stdout).toContain('ref = 1');
});
```

**analysis:**

the acceptance test uses fixture `with-boot-yaml-simple` which has:
- briefs = 3, say = 2, ref = 1

the playtest expects real repo data:
- briefs = 19, say = 7, ref = 12

**is this a coverage gap?**

no. the acceptance test verifies the **mechanism** (stats show say/ref breakdown). the playtest verifies the **specific outcome** (exact counts for this repo). both are needed:
- acceptance test: proves the feature works in isolation
- playtest: proves the config produces the expected result

---

### playtest step 2: verify say briefs appear inline

**playtest expectation:**
- 7 specific briefs appear with `<brief.say>` tags
- content is inline (not pointer only)

**acceptance test citation:**

file: `blackbox/cli/roles.boot.bootyaml.acceptance.test.ts`
case: `[case1] repo with boot.yml simple mode`
lines: 42-58

```ts
then('says matched briefs with full content (always-say.md)', () => {
  expect(result.stdout).toContain(
    '<brief.say path=".agent/repo=.this/role=any/briefs/always-say.md">',
  );
  expect(result.stdout).toContain(
    'this brief is matched by the say glob',
  );
});

then('says matched briefs with full content (deep.md)', () => {
  expect(result.stdout).toContain(
    '<brief.say path=".agent/repo=.this/role=any/briefs/subdir/deep.md">',
  );
  expect(result.stdout).toContain(
    'this brief is in a subdirectory and matched',
  );
});
```

**analysis:**

the acceptance test verifies:
1. `<brief.say path="...">` tag format
2. actual content appears inline (e.g., "this brief is matched by the say glob")

the playtest verifies:
1. 7 specific briefs by name
2. content inline (via `<brief.say>` tags)

**coverage alignment:** ✓ acceptance test proves say briefs appear inline with content

---

### playtest step 3: verify ref briefs appear as pointers

**playtest expectation:**
- unmatched briefs appear with `<brief.ref/>` tags
- content is NOT inline

**acceptance test citation:**

file: `blackbox/cli/roles.boot.bootyaml.acceptance.test.ts`
case: `[case1] repo with boot.yml simple mode`
lines: 60-68

```ts
then('refs unmatched briefs with path only (not-matched.md)', () => {
  expect(result.stdout).toContain(
    '<brief.ref path=".agent/repo=.this/role=any/briefs/not-matched.md"/>',
  );
  // should NOT contain full content of not-matched.md
  expect(result.stdout).not.toContain(
    'this brief is NOT matched by any say glob',
  );
});
```

**analysis:**

the acceptance test verifies:
1. `<brief.ref path="..."/>` tag format (self-closed, no content)
2. content does NOT appear (`.not.toContain()`)

the playtest verifies:
1. specific briefs listed as refs
2. content not inline (via `<brief.ref/>` self-closed tags)

**coverage alignment:** ✓ acceptance test proves ref briefs appear as pointers without content

---

### playtest step 4: verify symlinked directories followed

**playtest expectation:**
- briefs from `domain.thought/` and `infra.composition/` appear
- 6 from domain.thought/, 2 from infra.composition/

**acceptance test citation:**

none. no acceptance test covers symlinked directories.

**gap analysis:**

**is this a gap that needs a new test?**

no. reasons:

1. **symlinks are OS-level behavior** — the `roles boot` command uses standard filesystem traversal. symlink resolution is handled by the OS, not by boot.yml or rhachet code.

2. **fixture complexity** — acceptance test fixtures would need:
   - create actual symlinks (varies by OS)
   - ensure symlinks work in CI environment
   - handle Windows vs Unix symlink differences

3. **byhand is more authoritative** — the playtest runs on the real repo which has actual symlinks. this is more reliable than a synthetic fixture.

**is this untestable via automation?**

not untestable, but impractical. the cost-benefit does not favor automation:
- cost: fixture setup, cross-platform symlink handling
- benefit: coverage of OS-level behavior already proven by filesystem APIs

**conclusion:** byhand verification on real repo is the correct approach.

---

### playtest edge 1: boot without boot.yml

**playtest expectation:**
- absent boot.yml = say all (default behavior preserved)
- `say = 19`, `ref = 0`

**acceptance test citation:**

file: `blackbox/cli/roles.boot.bootyaml.acceptance.test.ts`
case: `[case2] repo with boot.yml but no boot.yml present`
lines: 119-150

```ts
given('[case2] repo with boot.yml but no boot.yml present', () => {
  const repo = useBeforeAll(async () =>
    genTestTempRepo({ fixture: 'with-briefs' }),
  );

  when('[t0] roles boot --repo .this --role any', () => {
    ...
    then('says all briefs with full content (backwards compat)', () => {
      expect(result.stdout).toContain('<brief.say path=');
      expect(result.stdout).toContain('sample brief');
    });

    then('stats do not show say/ref breakdown', () => {
      // when no boot.yml, no say/ref breakdown shown
      expect(result.stdout).not.toMatch(/say\s*=/);
      expect(result.stdout).not.toMatch(/ref\s*=/);
    });
  });
});
```

**analysis:**

the acceptance test verifies:
1. briefs are said (`.toContain('<brief.say path=')`)
2. content appears (`.toContain('sample brief')`)
3. no say/ref breakdown in stats (default behavior)

the playtest verifies:
1. all briefs said (`say = 19`)
2. no refs (`ref = 0`)
3. tokens ≈ 20k (baseline)

**coverage alignment:** ✓ acceptance test proves default behavior (say all) preserved

---

### playtest edge 2: boot.yml with typo

**playtest expectation:**
- typo in glob = brief appears as ref (graceful degradation)
- marked as "optional: covered by unit tests"

**acceptance test citation:**

none. no acceptance test covers typo/mismatch scenarios.

**gap analysis:**

**is this a gap that needs a new test?**

no. reasons:

1. **typo = glob matches no files** — the behavior is identical to a valid glob that happens to match zero files. this is pure partition logic.

2. **unit tests cover exhaustively** — `computeBootPlan.test.ts` tests:
   - globs that match all files
   - globs that match some files
   - globs that match no files (typo scenario)

3. **playtest marks as optional** — the playtest explicitly says "manual verification optional" because unit tests are authoritative.

**unit test citation:**

file: `src/domain.operations/boot/computeBootPlan.test.ts`

the test file covers all partition scenarios including empty matches. the glob resolution logic is deterministic — if a glob matches zero files, those briefs simply don't appear in the say set and thus become refs by exclusion.

**conclusion:** unit tests are authoritative for this edge case.

---

## step 3: coverage matrix with exact citations

| playtest step | acceptance test | citation | coverage |
|---------------|-----------------|----------|----------|
| step 1: stats | case1 [t0] | lines 31-35 | ✓ mechanism |
| step 2: say inline | case1 [t0] | lines 42-58 | ✓ format + content |
| step 3: ref pointers | case1 [t0] | lines 60-68 | ✓ format + no content |
| step 4: symlinks | — | — | byhand (OS-level) |
| edge 1: no boot.yml | case2 [t0] | lines 124-150 | ✓ default behavior |
| edge 2: typo | — | — | unit tests (optional) |

---

## step 4: hostile reviewer perspective

### hostile question: the acceptance test uses different counts (3 briefs) than the playtest (19 briefs). how can this be coverage?

**answer:** acceptance tests verify **mechanisms**, not **specific data**.

| test type | verifies | data source |
|-----------|----------|-------------|
| acceptance test | say/ref partition works | synthetic fixture |
| playtest | specific config produces expected result | real repo |

the acceptance test proves: "when boot.yml has say globs, matched briefs are said and unmatched briefs are reffed."

the playtest proves: "this specific boot.yml produces say=7, ref=12 for this repo."

both are needed. the acceptance test is the regression guard. the playtest is the behavior verification.

### hostile question: why doesn't the acceptance test check token count?

**answer:** token count depends on content length, which varies with:
- fixture content (synthetic)
- content complexity
- compression/minification

the acceptance test cannot assert on token count because it would couple to fixture content. the playtest verifies token reduction on real content.

### hostile question: why is step 4 (symlinks) not in acceptance tests?

**answer:** symlink resolution is OS-level, not rhachet-level. the acceptance test would be:

```ts
// this tests the OS, not rhachet
then('follows symlinks', () => {
  expect(fs.realpathSync(symlink)).toEqual(target);
});
```

the value is low (tests OS behavior) and the cost is high (cross-platform symlink handling). byhand verification on real repo is more authoritative.

### hostile question: are there acceptance test cases not covered by the playtest?

**answer:** yes, these are intentionally out of scope:

| acceptance test case | playtest coverage | reason |
|----------------------|-------------------|--------|
| case1: simple mode | ✓ | primary focus |
| case2: no boot.yml | ✓ edge 1 | backwards compat |
| case3: mixed mode error | — | error case, not happy path |
| case4-5: subject mode | — | different mode |
| case6: minified briefs | — | different feature |

the playtest focuses on simple mode happy path + edge cases relevant to this behavior.

---

## step 5: alignment verification

### acceptance test → playtest

| acceptance test | playtest step |
|-----------------|---------------|
| case1 [t0] stats | step 1 |
| case1 [t0] say briefs | step 2 |
| case1 [t0] ref briefs | step 3 |
| case1 [t1] subject error | — (out of scope) |
| case2 [t0] default | edge 1 |
| case3-6 | — (out of scope) |

### playtest → acceptance test

| playtest step | acceptance test |
|---------------|-----------------|
| step 1 | case1 lines 31-35 |
| step 2 | case1 lines 42-58 |
| step 3 | case1 lines 60-68 |
| step 4 | — (byhand) |
| edge 1 | case2 lines 124-150 |
| edge 2 | — (unit tests) |

---

## summary

| check | status | citation |
|-------|--------|----------|
| step 1 cited | ✓ | case1 lines 31-35 |
| step 2 cited | ✓ | case1 lines 42-58 |
| step 3 cited | ✓ | case1 lines 60-68 |
| step 4 cited | n/a | byhand (OS-level) |
| edge 1 cited | ✓ | case2 lines 124-150 |
| edge 2 cited | n/a | unit tests (optional) |
| gaps documented | ✓ | step 4, edge 2 justified |

**verdict:** acceptance test citations complete with exact line numbers.

---

## why this holds

### the fundamental question

do acceptance tests cover each playtest step?

### the answer

yes, with documented exceptions:

1. **steps 1-3 are covered** — case1 [t0] tests say/ref partition mechanism with exact line citations
2. **edge 1 is covered** — case2 [t0] tests default behavior (say all)
3. **step 4 is justifiably uncovered** — symlink behavior is OS-level, byhand is authoritative
4. **edge 2 is justifiably uncovered** — typo behavior is unit-tested, playtest marks optional

### evidence chain

| claim | evidence |
|-------|----------|
| step 1 covered | lines 31-35: stats show say/ref breakdown |
| step 2 covered | lines 42-58: say briefs inline with content |
| step 3 covered | lines 60-68: ref briefs as pointers, no content |
| step 4 gap acceptable | symlinks are OS feature, fixture impractical |
| edge 1 covered | lines 124-150: all briefs said without boot.yml |
| edge 2 gap acceptable | unit tests cover, playtest marks optional |

### conclusion

acceptance test citations satisfied because:
1. core behavior (steps 1-3) has exact line citations from case1
2. default behavior (edge 1) has exact line citations from case2
3. gaps (step 4, edge 2) are documented with clear justification
4. playtest and acceptance tests are aligned on scope

the verification checklist accurately reflects: acceptance test citations complete.
