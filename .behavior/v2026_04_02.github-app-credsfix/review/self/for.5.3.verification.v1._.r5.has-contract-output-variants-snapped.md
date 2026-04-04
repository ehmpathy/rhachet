# review: has-contract-output-variants-snapped (r5)

## verdict: pass — no new or modified public contracts

## question: does each public contract have snapshots for all output variants?

### scope assessment

this PR:
- fixes an internal stdin read bug in `src/infra/promptHiddenInput.ts` and `src/infra/promptVisibleInput.ts`
- does NOT introduce any new CLI commands, SDK methods, or API endpoints
- does NOT modify the input/output format of any extant command

the public contract (`keyrack set`, `keyrack get`) remains unchanged. the fix affects only the internal code path that reads piped stdin content.

### what changed

| file | change type | public contract? |
|------|-------------|------------------|
| `src/infra/promptHiddenInput.ts` | internal bug fix | no — internal infra |
| `src/infra/promptVisibleInput.ts` | internal bug fix | no — internal infra |
| `blackbox/cli/keyrack.set.acceptance.test.ts` | added [case5] | no — test file |

### snapshot analysis

**new snapshots:** none required — no new contract

**extant snapshots for keyrack.set:**

| snapshot | variants covered |
|----------|-----------------|
| `keyrack.set.acceptance.test.ts.snap` | set success (JSON), list after set |

**why [case5] doesn't add snapshots:**

the extant [case1] tests use `.toMatchSnapshot()` to capture the JSON output structure. my [case5] tests:
1. the same command (`keyrack set`)
2. the same output format (JSON)
3. different stdin content (multiline vs single-line)

the value of [case5] is the **exact round-trip assertion**:

```typescript
expect(parsed.grant.key.secret).toEqual(multilineJson);
```

this assertion proves the bug is fixed more precisely than a snapshot would. a snapshot would just show "this is the JSON shape" — but the exact content match proves byte-for-byte fidelity.

### why this holds

1. **no new contract** — the fix corrects internal behavior, not the public API
2. **output format unchanged** — `keyrack set --json` produces the same structure
3. **direct assertion is stronger** — exact equality check proves round-trip better than snapshot
4. **secret in snapshot is unnecessary** — the secret content is the test data itself, not a contract surface to review

### conclusion

no new or modified public contracts require snapshot coverage. the bug fix is internal, and the acceptance test uses direct assertions that prove correctness more precisely than snapshots would.

