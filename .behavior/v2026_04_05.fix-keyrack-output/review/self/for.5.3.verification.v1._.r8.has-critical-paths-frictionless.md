# self-review: has-critical-paths-frictionless (deeper pass — implementation + test verification)

## the question

double-check: are the critical paths frictionless in practice?

## the review

### verification approach

this review verifies critical paths via:
1. **implementation analysis** — read the actual CLI code
2. **test evidence** — verify tests exercise real shell behavior
3. **edge case coverage** — check shell escapes work in practice

### critical path 1: `keyrack get --value`

#### implementation trace

```
invokeKeyrack.ts:351 — .option('--value', 'shorthand for --output value')
invokeKeyrack.ts:365-367 — output mode derivation
invokeKeyrack.ts:370-372 — validation: --value requires --key
invokeKeyrack.ts:474-476 — process.stdout.write (no newline)
```

**why it holds:**
- `process.stdout.write` used instead of `console.log` — no final newline
- validation at line 370 prevents --value without --key
- exit code 2 on not granted (line 472)

#### test evidence

```
keyrack.get.output.acceptance.test.ts:[t5]
  — tests --value output has no extra whitespace
  — expect(result.stdout).toEqual(envValue) ← exact match, no newline
```

### critical path 2: `eval "$(keyrack source --env test)"`

#### implementation trace

```
invokeKeyrack.ts:504 — .command('source')
invokeKeyrack.ts:507 — .requiredOption('--env')
invokeKeyrack.ts:508 — .requiredOption('--owner')
invokeKeyrack.ts:581-588 — emit export statements
invokeKeyrack.ts:584 — asShellEscapedSecret for each secret
```

**why it holds:**
- owner and env are required (lines 507-508)
- export format: `export ${keyName}=${escaped}` (line 587)
- shell escape via dedicated transformer

#### test evidence

```
keyrack.source.cli.acceptance.test.ts:[case1][t2]
  — lines 105-146: actual eval verification
  — runs: bash -c `eval "${sourceResult.stdout}" && echo "KEY1=$KEY1"`
  — verifies: expect(result.stdout).toContain(`KEY1=${envValue1}`)
```

this test exercises the actual eval flow users will use.

### critical path 3: `keyrack source --key X`

#### implementation trace

```
invokeKeyrack.ts:506 — .option('--key', 'single key to source')
invokeKeyrack.ts:549-555 — opts.key ? [getOne] : getAllByRepo
```

**why it holds:**
- --key is optional; when present, fetches single key
- same export format as all-keys mode
- same shell escape logic applies

#### test evidence

```
keyrack.source.cli.acceptance.test.ts:[case1][t1]
  — tests --key outputs single export
  — expect(result.stdout).toContain(envKey1)
  — expect(result.stdout).not.toContain(envKey2)
```

### critical path 4: `keyrack source --strict`

#### implementation trace

```
invokeKeyrack.ts:510 — .option('--strict', 'fail if any key not granted (default)')
invokeKeyrack.ts:537 — const isLenient = opts.lenient ?? false; ← strict is default
invokeKeyrack.ts:566-578 — strict mode failure logic
invokeKeyrack.ts:571 — stderr: `not granted: ${slug} (${status})`
invokeKeyrack.ts:575 — hint: 'use --lenient if partial results are acceptable'
invokeKeyrack.ts:577 — process.exit(2)
```

**why it holds:**
- strict is default (line 537)
- no stdout on failure (prevents partial eval)
- stderr shows which keys failed + hint
- exit 2 for constraint error

#### test evidence

```
keyrack.source.cli.acceptance.test.ts:[case2]
  — tests strict mode when some keys not granted
  — expect(result.status).toEqual(2)
  — expect(result.stdout).toEqual('') ← no partial exports
  — expect(result.stderr).toContain('not granted')
  — expect(result.stderr).toContain('--lenient')
```

### critical path 5: `keyrack source --lenient`

#### implementation trace

```
invokeKeyrack.ts:511 — .option('--lenient', 'skip absent keys silently')
invokeKeyrack.ts:537 — const isLenient = opts.lenient ?? false;
invokeKeyrack.ts:566 — if (!isLenient && notGranted.length > 0) ← skipped when lenient
invokeKeyrack.ts:581-588 — only granted keys emitted
```

**why it holds:**
- lenient skips the strict failure block
- only granted keys in output
- no stderr noise in lenient mode (SDK parity)

#### test evidence

```
keyrack.source.cli.acceptance.test.ts:[case3]
  — tests lenient mode with some keys not granted
  — expect(result.status).toEqual(0)
  — expect(result.stdout).toContain(grantedKey)
  — expect(result.stdout).not.toContain(absentKey)
```

### shell escape verification

#### implementation trace

```
asShellEscapedSecret.ts:14 — detects control chars via regex
asShellEscapedSecret.ts:16-35 — ANSI-C $'...' for control chars
asShellEscapedSecret.ts:40-41 — 'sec'\''ret' for embedded quotes
```

**why it holds:**
- two code paths: plain quotes vs ANSI-C
- backslash escaped before quote (order matters)
- regex patterns use RegExp constructor to avoid lint issues

#### test evidence

```
keyrack.source.cli.acceptance.test.ts:[case6]
  — [t0]: secret="sec'ret" → verifies eval sets KEY="sec'ret"
  — [t1]: secret="line1\nline2" → verifies eval preserves newlines
  — [t2]: secret="path\\name" → verifies eval preserves backslash
```

each test runs actual bash eval to verify escapes work in practice.

### friction check matrix

| path | implementation | test coverage | friction |
|------|----------------|---------------|----------|
| --value | process.stdout.write, no newline | [t5] exact match | none |
| source all | export loop with escape | [t2] real bash eval | none |
| source --key | conditional single fetch | [t1] contains/not contains | none |
| --strict | default, no stdout on fail | [case2] exit 2, empty stdout | none |
| --lenient | skip failure block | [case3] exit 0, partial exports | none |
| shell escape | dual-path (plain/ANSI-C) | [case6] real bash eval for each | none |

## found concerns

none. implementation analysis confirms:
- correct output format (no extra whitespace)
- proper shell escape logic (tested via real bash eval)
- clear error behavior (exit 2, stderr hints)
- SDK parity (strict default, lenient silent)

## conclusion

**has-critical-paths-frictionless check: PASS**

evidence:
- implementation traced line-by-line for each critical path
- test evidence shows actual shell behavior verification
- bash -c eval tests prove shell escapes work in practice
- all 5 critical paths verified via implementation + test

