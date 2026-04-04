# self-review: has-contract-output-variants-snapped (r6)

## the core question

> does each public contract have snapshots for all output variants?

## answer

yes, within scope of this bug fix. no public contract was modified.

## detailed analysis

### step 1: identify what changed

```bash
git diff main --name-status | grep -v .behavior
```

| file | change type |
|------|-------------|
| `src/domain.operations/keyrack/fillKeyrackKeys.ts` | modified (line 258) |
| `src/domain.operations/keyrack/fillKeyrackKeys.integration.test.ts` | modified (case8 added) |
| `src/domain.operations/keyrack/asKeyrackKeyOrg.ts` | new (untracked) |
| `src/domain.operations/keyrack/asKeyrackKeyOrg.test.ts` | new (untracked) |

### step 2: determine if any public contract was modified

| layer | artifact | modified? | public contract? |
|-------|----------|-----------|------------------|
| cli | `rhx keyrack fill` | no | yes |
| sdk | none | n/a | n/a |
| api | none | n/a | n/a |
| domain | `fillKeyrackKeys` | yes (internal) | no (internal) |
| domain | `asKeyrackKeyOrg` | new (internal) | no (internal) |

**conclusion**: no public contract was modified.

### step 3: verify CLI contract unchanged

the cli command `rhx keyrack fill` uses fillKeyrackKeys internally. the change at line 258:

```ts
// before
org: repoManifest.org

// after
org: asKeyrackKeyOrg({ slug })
```

affects which org value is passed to setKeyrackKey, but does NOT change:
- command signature
- command options
- output structure (treestruct format)
- success messages
- error messages

### step 4: verify snapshot files unchanged

```bash
git diff main -- blackbox/cli/__snapshots__/keyrack.fill.acceptance.test.ts.snap
```

result: empty (no changes)

this confirms the CLI output format is unchanged.

### step 5: verify snapshot coverage at CLI layer

**file**: `blackbox/cli/keyrack.fill.acceptance.test.ts`

| case | scenario | snapshot? | line |
|------|----------|-----------|------|
| case1 | `--help` | yes | 55 |
| case2 | absent `--env` | no (error) | — |
| case3 | no keyrack.yml | no (error) | — |
| case4 | no keys for env | yes | 147 |
| case5 | nonexistent `--key` | no (error) | — |
| case6 | env=all fallback | yes | 219 |

**why error cases lack snapshots**: error messages are validated via assertions (`expect(result.stderr).toContain(...)`) not snapshots. this is appropriate because error messages may include paths or dynamic values.

**success case snapshots present**:
- case1: help output (static, complete)
- case4: empty result output (static, complete)
- case6: env=all fallback output (static, complete)

### step 6: assess cross-org scenario

the bug fix affects the cross-org extends scenario. should this have a CLI acceptance test with snapshot?

**analysis**:
1. the integration test `fillKeyrackKeys.integration.test.ts` [case8] covers this scenario
2. the CLI layer simply invokes fillKeyrackKeys — no additional logic
3. the output format is identical to other fill scenarios
4. only the org segment of slugs differs (rhight vs ahbode)

**what a snapshot would show**:
```
🔑 key 1/2, USPTO_ODP_API_KEY, for 1 owner
   └─ for owner default
      └─ 🟢 found vaulted under rhight.prod.USPTO_ODP_API_KEY
```

vs the wrong (buggy) behavior:
```
      └─ 🟢 found vaulted under ahbode.prod.USPTO_ODP_API_KEY
```

the difference is a single string segment: `rhight` vs `ahbode`.

**verdict**: the integration test is the appropriate layer for this verification because:
1. it tests the exact behavior (org extraction from slug)
2. it uses explicit assertions (`expect(slugs).toContain('rhight.prod.USPTO_ODP_API_KEY')`)
3. a CLI acceptance test would duplicate coverage without additional insight
4. no new output structure/format was introduced

### step 7: verify integration test assertions are specific

**file**: `fillKeyrackKeys.integration.test.ts` lines 738-741

```ts
// verify both keys set under correct orgs
expect(slugs).toContain('rhight.prod.USPTO_ODP_API_KEY');
expect(slugs).toContain('ahbode.prod.DB_PASSWORD');
```

these assertions verify:
1. USPTO_ODP_API_KEY stored under `rhight` (from extended keyrack), not `ahbode` (root)
2. DB_PASSWORD stored under `ahbode` (from root keyrack)

this is the core behavior the fix addresses.

## summary table

| question | answer | evidence |
|----------|--------|----------|
| public contract modified? | no | git diff shows only internal files |
| new output variant added? | no | snapshot file unchanged |
| success cases snapped? | yes | 3 snapshots in fill acceptance test |
| error cases validated? | yes | via assertions |
| cross-org scenario tested? | yes | integration test [case8] |
| cross-org assertions specific? | yes | explicit org verification |

## conclusion

the review question is "does each public contract have snapshots for all output variants?"

**answer**: yes. no public contract was modified. the bug fix is internal to `fillKeyrackKeys`. the CLI contract `rhx keyrack fill` is unchanged. the snapshot coverage at the CLI layer remains adequate. the cross-org scenario is appropriately tested at the integration layer with explicit assertions.

no action required.
