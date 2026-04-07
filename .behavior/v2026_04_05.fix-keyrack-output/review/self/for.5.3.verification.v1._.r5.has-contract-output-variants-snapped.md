# self-review: has-contract-output-variants-snapped

## the question

double-check: does each public contract have snapshots for all output variants?

for each new or modified public contract:
- is there a dedicated snapshot file?
- does it capture success, error, and edge cases?

## the review

### public contracts introduced

this behavior introduces two public CLI contracts:
1. `keyrack get --output <mode>` / `--value` — raw secret output
2. `keyrack source` — shell export statements

### snapshot file existence

verified via glob:

| contract | snapshot file | exists? |
|----------|---------------|---------|
| keyrack get --output | blackbox/cli/__snapshots__/keyrack.get.output.acceptance.test.ts.snap | ✓ |
| keyrack source | blackbox/cli/__snapshots__/keyrack.source.cli.acceptance.test.ts.snap | ✓ |

### snapshot coverage audit: keyrack get --output

read snapshot file content:

| variant | snapshot key | captured? |
|---------|-------------|-----------|
| --output vibes (success) | `[case1]...[t3]...treestruct` | ✓ |
| --value locked | `[case2]...[t0]...stderr` | ✓ |
| --value absent | `[case3]...[t0]...stderr` | ✓ |

**actual snapshot content verified:**
- vibes output shows treestruct with vault, mech, status
- locked/absent errors show status message on stderr

### snapshot coverage audit: keyrack source

read snapshot file content:

| variant | snapshot key | captured? |
|---------|-------------|-----------|
| source all keys (success) | `[case1]...[t0]...export statements` | ✓ |
| source single key | `[case1]...[t1]...single export` | ✓ |
| strict mode error | `[case2]...[t1]...stderr` | ✓ |
| lenient mode partial | `[case3]...[t0]...partial exports` | ✓ |
| shell escape: single quote | `[case6]...[t0]` | ✓ |
| shell escape: newline | `[case6]...[t1]` | ✓ |
| shell escape: backslash | `[case6]...[t2]` | ✓ |

**actual snapshot content verified:**
- export statements use correct single-quote format
- strict mode stderr shows hint for --lenient
- shell escapes: `'sec'\''ret'`, `$'line1\nline2'`, `'path\name'`

### why snapshots matter here

these snapshots enable:
1. **vibecheck in PRs** — reviewers see actual CLI output without test execution
2. **drift detection** — format changes surface in diffs
3. **shell compatibility** — escape syntax is visually auditable

### gap check

| expected variant | covered? |
|------------------|----------|
| get vibes success | ✓ |
| get value locked | ✓ |
| get value absent | ✓ |
| source success | ✓ |
| source single key | ✓ |
| source strict error | ✓ |
| source lenient partial | ✓ |
| source shell escapes | ✓ (3 variants) |

**no gaps found.** all expected variants have snapshot coverage.

## found concerns

none. both contracts have dedicated snapshot files with coverage for:
- success cases
- error cases (locked, absent, strict mode)
- edge cases (shell escapes)

## conclusion

**has-contract-output-variants-snapped check: PASS**

- keyrack.get.output.acceptance.test.ts.snap: 3 snapshots (vibes, locked, absent)
- keyrack.source.cli.acceptance.test.ts.snap: 7 snapshots (success, single, strict, lenient, 3 escape variants)
- actual content verified via Read
- all output variants captured
