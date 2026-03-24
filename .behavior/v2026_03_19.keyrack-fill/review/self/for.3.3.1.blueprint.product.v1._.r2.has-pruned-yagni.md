# self-review r2: has-pruned-yagni

## cross-reference with wish and vision

### CLI flags

| flag | source | verdict |
|------|--------|---------|
| `--env` | wish: explicitly requested | ✓ needed |
| `--owner` | wish: explicitly requested | ✓ needed |
| `--prikey` | wish: explicitly requested | ✓ needed |
| `--key` | vision: "fill specific key only" | ✓ needed |
| `--refresh` | vision: "refresh even if already set" | ✓ needed |

### orchestrator components

| component | source | verdict |
|-----------|--------|---------|
| load repo manifest | wish: "based on the repo manifest" | ✓ needed |
| get keys for env | wish: "keys prescribed by repo manifest" | ✓ needed |
| filter to specific key | vision: `--key` flag | ✓ needed |
| for each key, for each owner | wish: explicitly prescribed loop order | ✓ needed |
| check if already set | vision: "skips already-configured" | ✓ needed |
| infer vault | wish: "infer vault when not prescribed" | ✓ needed |
| prompt for secret | wish: interactive fill | ✓ needed |
| set → unlock → get | wish: "verify roundtrip usable" | ✓ needed |
| track results | needed for exit code and summary | ✓ needed |

### return type

```ts
Promise<{
  results: FillKeyResult[];
  summary: { set: number; skipped: number; failed: number };
}>
```

**question:** is the return type needed?

**answer:** yes. vision specifies:
- "exits 0 when all keys verified"
- "exits 1 if any key fails roundtrip"

to determine exit code, orchestrator must track results. return type is minimal.

### test coverage

| test type | needed? |
|-----------|---------|
| unit tests | no new ones — reuses extant |
| integration tests | yes — journey tests for fill flows |
| acceptance tests | yes — CLI blackbox via subprocess |

**question:** is genMockKeyrackRepoManifest.ts needed?

**answer:** yes. integration tests need manifest fixtures. a generator avoids duplication across test cases.

### explicitly deferred (out of scope)

| feature | reason for deferral |
|---------|---------------------|
| stdin pipe automation | v2 — adds complexity |
| `--same-value` flag | v2 — not in wish/vision |
| `--owner @all` mode | v2 — not in wish/vision |

these are correctly deferred, not added "while we're here."

---

## conclusion

**no YAGNI found.** every component traces to an explicit request in wish or vision. the blueprint is minimal:
- reuses extant primitives
- adds no new domain objects or DAOs
- adds no abstractions "for future flexibility"
- explicitly defers unasked features to out-of-scope

