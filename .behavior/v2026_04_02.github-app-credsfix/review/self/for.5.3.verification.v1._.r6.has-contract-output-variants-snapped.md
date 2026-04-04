# review: has-contract-output-variants-snapped (r6)

## verdict: pass — no new contracts, bug fix only

## question: does each public contract have snapshots for all output variants?

### step 1: identify all new or modified public contracts

```bash
git diff main --name-only
```

**files changed:**

| file | type | public contract? |
|------|------|------------------|
| `src/infra/promptHiddenInput.ts` | implementation | no — internal infra |
| `src/infra/promptVisibleInput.ts` | implementation | no — internal infra |
| `blackbox/cli/keyrack.set.acceptance.test.ts` | test | no — test file |

**new files (untracked):**

| file | type | public contract? |
|------|------|------------------|
| `src/infra/promptHiddenInput.integration.test.ts` | test | no — test file |
| `src/infra/promptVisibleInput.integration.test.ts` | test | no — test file |
| `src/infra/__test_promptHiddenInput.ts` | test runner | no — test helper |
| `src/infra/__test_promptVisibleInput.ts` | test runner | no — test helper |

**conclusion:** zero new or modified public contracts

### step 2: verify no contract modifications

the PR fixes an internal bug. let me verify the public contract surfaces are unchanged:

**keyrack set:**
- input: `--key`, `--env`, `--mech`, `--vault`, stdin
- output: JSON with `slug`, `mech`, `vault`, etc.
- **unchanged** — same input/output format before and after

**keyrack get:**
- input: `--key`, `--env`, `--allow-dangerous`, `--json`
- output: JSON with `status`, `grant.key.secret`, etc.
- **unchanged** — same input/output format before and after

the fix affects **what bytes are stored**, not **how commands are invoked or what shape they return**.

### step 3: review extant snapshot coverage

```bash
ls blackbox/cli/__snapshots__/keyrack.set.acceptance.test.ts.snap
```

**extant snapshots:**

| test case | snapshot name | variants covered |
|-----------|---------------|------------------|
| [case1] t0 | `stdout matches snapshot 1` | set success (JSON structure) |
| [case1] t1 | `stdout matches snapshot 1` | list after set (JSON structure) |

these snapshots cover the output structure of `keyrack set` and `keyrack list`.

### step 4: does [case5] need snapshots?

**[case5] purpose:** prove multiline JSON round-trips correctly

**what [case5] tests:**
- `keyrack set` with multiline stdin → success
- `keyrack get` → secret matches exact input

**why direct assertion is correct for [case5]:**

the goal of [case5] is to prove **exact round-trip**. a snapshot would show:

```
"secret": "{\n  \"appId\": \"3234162\",\n  ..."
```

but the direct assertion:

```typescript
expect(parsed.grant.key.secret).toEqual(multilineJson);
```

proves **exact equality** which is stronger than "looks like this snapshot". the snapshot would be redundant — it would just show the same data that the equality check already proves.

**why snapshots don't add value here:**

| aspect | snapshot | direct assertion |
|--------|----------|------------------|
| proves exact match | no — visual comparison | yes — programmatic equality |
| drift detection | yes — but what would drift? | n/a — the fix is exact equality |
| vibecheck | marginal — shows JSON blob | not needed — bug fix is binary pass/fail |

the purpose of this test is to prove "what goes in comes out unchanged". that's an equality check, not a shape check.

### step 5: are there absent variants?

**for keyrack set (not new, not modified):**
- success case: covered by extant [case1]
- error case: not in scope for this PR
- help case: not in scope for this PR

**for [case5] (new test of extant command):**
- success with multiline: covered by direct assertions
- error case: not the purpose of this test
- edge case: the multiline content IS the edge case

### why this holds

1. **no new contracts** — this PR fixes internal behavior only
2. **no modified contracts** — input/output format unchanged
3. **extant coverage is adequate** — keyrack.set has snapshots for structure
4. **[case5] uses direct assertions** — proves exact equality which is stronger than snapshot for this use case
5. **snapshot would be redundant** — the test data is the assertion

### conclusion

no new or modified public contracts exist in this PR. the extant snapshot coverage for `keyrack set` is adequate. the new [case5] uses direct assertions to prove exact round-trip, which is the appropriate test strategy for a bug fix that corrects data fidelity.

