# self-review r7: has-consistent-mechanisms

## review for mechanisms that duplicate extant functionality

### new mechanisms in blueprint

| mechanism | purpose |
|-----------|---------|
| `asShellEscapedSecret.ts` | shell escape transformer for secret values |
| `keyrack source` command | CLI output of shell export statements |

### extant mechanisms found

| mechanism | location | purpose |
|-----------|----------|---------|
| shell escape logic | `executeSkill.ts:62-68` | escapes command arguments |
| `sourceAllKeysIntoEnv` | `domain.operations/keyrack/` | SDK: injects keys into process.env |
| `formatKeyrackGetOneOutput` | `domain.operations/keyrack/cli/` | vibes output for single key |
| `formatKeyrackGetAllOutput` | `domain.operations/keyrack/cli/` | vibes output for all keys |

---

## deep analysis: asShellEscapedSecret vs extant shell escape

**question:** does asShellEscapedSecret duplicate extant escape logic in executeSkill.ts?

**extant code (executeSkill.ts:62-68):**
```ts
// use single quotes to prevent all shell interpretation
// escape embedded single quotes: ' → '\''
return `'${arg.replace(/'/g, "'\\''")}'`;
```

**proposed asShellEscapedSecret requirements:**
- wrap in single quotes: `'secret'`
- escape single quotes: `'sec'\''ret'`
- handle newlines: `$'line1\nline2'` (ANSI-C syntax)
- handle backslashes: preserve in output

**analysis:**
- same pattern: both use `'${value.replace(/'/g, "'\\''")}'`
- different scope: executeSkill escapes command args; asShellEscapedSecret escapes secret values
- different requirements: secrets can contain newlines (need ANSI-C syntax), args typically do not
- executeSkill does NOT handle newlines; asShellEscapedSecret must

**could we extract shared logic?**
- executeSkill's escape is inline (3 lines)
- asShellEscapedSecret adds newline support
- extraction would complicate executeSkill for no gain
- WET principle: OK to have similar code in two places with different requirements

**verdict:** not duplicative. same base pattern, different requirements. consistent approach.

---

## deep analysis: keyrack source vs sourceAllKeysIntoEnv

**question:** does CLI `keyrack source` duplicate SDK `sourceAllKeysIntoEnv`?

**extant SDK (sourceAllKeysIntoEnv):**
- calls `rhx keyrack get --for repo --json`
- filters to keys for env (includes env=all fallback)
- strict mode: exit 2 if any keys not granted
- lenient mode: skip absent keys
- injects into `process.env` (Node.js use)

**proposed CLI (keyrack source):**
- calls same core keyrack get logic
- filters to keys for env
- strict mode: exit 2 if any keys not granted
- lenient mode: skip absent keys
- outputs `export KEY='value'` statements (shell eval use)

**analysis:**
- different targets: SDK injects into process.env, CLI outputs for shell eval
- same semantics: strict/lenient modes, exit 2 on failure
- CLI is the shell counterpart to SDK function
- the wish explicitly asked for CLI version: "rhx keyrack source"

**could we reuse sourceAllKeysIntoEnv?**
- no: it injects into process.env, not outputs export statements
- CLI needs shell output, not Node.js injection
- different interfaces for different consumers

**verdict:** not duplicative. CLI and SDK serve different consumers with same semantics.

---

## deep analysis: output format

**question:** does the blueprint duplicate extant formatters?

**extant formatters:**
- `formatKeyrackGetOneOutput` — vibes for single key
- `formatKeyrackGetAllOutput` — vibes for all keys

**proposed output modes:**
- vibes: reuses `formatKeyrackGetOneOutput` (no new code)
- json: uses standard `JSON.stringify` (no new code)
- value: `process.stdout.write(secret)` (3 lines inline)
- source: export statements (inline per r3 review)

**analysis:**
- vibes reuses extant formatter — consistent
- json uses standard pattern — consistent
- value is minimal inline code — consistent with simple operations
- source was considered for extraction (r3), inlined as simpler approach

**verdict:** consistent with extant patterns. reuses what exists, adds minimal new code.

---

## issues found

none.

## why it holds

all new mechanisms are consistent with extant codebase:

1. **asShellEscapedSecret.ts:**
   - same base pattern as executeSkill.ts escape logic
   - extended for newline support (secrets can contain newlines)
   - WET principle: similar-but-different is OK

2. **keyrack source command:**
   - CLI counterpart to SDK's sourceAllKeysIntoEnv
   - same strict/lenient semantics, same exit codes
   - different output targets (shell vs Node.js)

3. **output format:**
   - vibes: reuses extant formatKeyrackGetOneOutput
   - json: standard JSON.stringify pattern
   - value/source: minimal inline code

no extant utilities were ignored or duplicated without reason.
