# self-review: has-contract-output-variants-snapped (second pass — deeper verification)

## the question

double-check: does each public contract have snapshots for all output variants?

## the review

### snapshot call sites verified

ran grep for `toMatchSnapshot` to count actual snapshot assertions:

| file | toMatchSnapshot calls | line numbers |
|------|----------------------|--------------|
| keyrack.get.output.acceptance.test.ts | 3 | 160, 248, 296 |
| keyrack.source.cli.acceptance.test.ts | 7 | 64, 101, 215, 293, 599, 660, 717 |

**total: 10 snapshot assertions**

### line-by-line snapshot purpose analysis

#### keyrack.get.output.acceptance.test.ts

| line | context | what it captures |
|------|---------|-----------------|
| 160 | case1 t3 | `--output vibes` treestruct format |
| 248 | case2 t0 | `--value` locked key stderr |
| 296 | case3 t0 | `--value` absent key stderr |

**why these three?** they capture the distinct output formats:
- vibes = the default human-readable format
- locked/absent = error messages users see on failure

#### keyrack.source.cli.acceptance.test.ts

| line | context | what it captures |
|------|---------|-----------------|
| 64 | case1 t0 | source all keys export format |
| 101 | case1 t1 | source single key export format |
| 215 | case2 t1 | strict mode stderr (not granted + hint) |
| 293 | case3 t0 | lenient mode partial export format |
| 599 | case6 t0 | single quote escape: `'sec'\''ret'` |
| 660 | case6 t1 | newline escape: `$'line1\nline2'` |
| 717 | case6 t2 | backslash escape: `'path\name'` |

**why these seven?** they capture:
- success formats (all keys, single key, lenient partial)
- error format (strict mode with hint)
- shell escape formats (all three edge cases)

### coverage matrix

| contract | success | error | edge cases | total |
|----------|---------|-------|------------|-------|
| keyrack get --output | 1 (vibes) | 2 (locked, absent) | 0 | 3 |
| keyrack source | 3 (all, single, lenient) | 1 (strict) | 3 (escapes) | 7 |

### absent variant check

reviewed against blueprint test coverage specification:

| specified variant | snapshot exists? |
|-------------------|------------------|
| get vibes success | ✓ (line 160) |
| get value locked stderr | ✓ (line 248) |
| get value absent stderr | ✓ (line 296) |
| source all keys | ✓ (line 64) |
| source single key | ✓ (line 101) |
| source strict error | ✓ (line 215) |
| source lenient partial | ✓ (line 293) |
| source quote escape | ✓ (line 599) |
| source newline escape | ✓ (line 660) |
| source backslash escape | ✓ (line 717) |

**no absent variants.** all specified output formats have snapshots.

### snapshot content quality

verified via Read that snapshots contain actual output:
- not placeholder text
- not truncated
- show complete format reviewers need to see

examples:
- vibes shows full treestruct with vault, mech, status
- exports show correct quote escape
- errors show hint for user action

## found concerns

none. all 10 snapshots:
- exist at cited line numbers
- capture distinct output variants
- show complete output format
- match blueprint specification

## conclusion

**has-contract-output-variants-snapped check: PASS**

evidence:
- grep confirms 10 toMatchSnapshot calls
- line numbers verified
- coverage matrix shows success + error + edge cases
- no absent variants from blueprint
- snapshot content verified via Read
