# self-review r5: has-pruned-yagni

## review for extras not prescribed

### components vs requirements

| component | source requirement | verdict |
|-----------|-------------------|---------|
| `--value` flag | wish: "keyrack should support rhx keyrack get --value" | keep |
| `--output <mode>` | vision Q&A: "--output is the full format, --value is an alias" | keep |
| `--json` flag | vision: alias for --output json | keep |
| `keyrack source` | wish: "support rhx keyrack source --key xyz" | keep |
| `--strict` mode | wish: "with --strict mode" | keep |
| `--lenient` mode | wish: "in a way that matches the sdk" (SDK has lenient) | keep |
| `--key` filter | wish: "rhx keyrack source --key xyz" | keep |
| `--env` required | obvious: which env to source? | keep |
| `--owner` required | SDK parity: sourceAllKeysIntoEnv needs owner | keep |
| asShellEscapedSecret.ts | vision: "shell escape single quotes" | keep |

### YAGNI checklist

| question | answer |
|----------|--------|
| added abstraction "for future flexibility"? | no — formatKeyrackSourceOutput.ts was deleted in r3 |
| added features "while we're here"? | no — all features trace to wish/vision |
| optimized before needed? | no — inline format logic is simplest approach |

### deeper look: is asShellEscapedSecret.ts YAGNI?

**question:** could we inline the shell escape logic too?

**analysis:**
- shell escape is ~15 lines with edge cases
- handles single quotes, newlines, backslashes
- security-critical: wrong escape = injection risk
- unit tests verify edge cases independently

**verdict:** keep. this is minimum viable for security-critical logic.

### deeper look: unit tests vs acceptance tests

**question:** do we need unit tests if acceptance tests verify behavior?

**analysis:**
- unit tests: fast, verify edge cases in isolation
- acceptance tests: slow, verify end-to-end behavior
- shell escape has many edge cases (quote, newline, backslash, mixed)

**verdict:** keep unit tests. they provide faster feedback for edge cases.

### deeper look: --json flag

**question:** was --json explicitly requested?

**evidence:**
- vision: "--json is an alias for --output json"
- extant: keyrack get already has --json flag

**verdict:** keep. extends extant pattern, explicitly in vision.

## issues found

| component | issue | fix |
|-----------|-------|-----|
| `invokeRhachetCliBinary.ts` | marked "[~] extend sanitizer if needed" — speculative YAGNI | remove from filediff tree |

### analysis of found issue

the blueprint says "extend sanitizer if needed" for invokeRhachetCliBinary.ts.

**why this is YAGNI:**
- "if needed" = we don't know if we need it
- no specific requirement in vision/criteria for sanitizer changes
- the test infra already handles CLI output
- speculative changes invite scope creep

**fix:** remove this line from the filediff tree. if sanitizer extension becomes necessary at implementation time, add it then.

### fix applied

removed from filediff tree:
```
└─ .test/
   └─ infra/
      └─ [~] invokeRhachetCliBinary.ts                 # extend sanitizer if needed
```

## why it holds

all components trace directly to:
1. the wish ("keyrack should support rhx keyrack get --value; it should also support rhx keyrack source --key xyz, with --strict mode, in a way that matches the sdk")
2. the vision (Q&A clarified --output as full format, --value as alias)
3. SDK parity (--lenient, --owner)

no components were added "while we're here" or "for future flexibility".

the simplest approach is taken:
- format logic inlined (no formatKeyrackSourceOutput.ts)
- shell escape extracted (security-critical)
- tests match scope (unit for edge cases, acceptance for behavior)

