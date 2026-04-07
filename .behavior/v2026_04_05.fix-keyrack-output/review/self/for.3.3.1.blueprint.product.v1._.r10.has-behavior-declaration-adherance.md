# self-review r10: has-behavior-declaration-adherance

## review for adherence to behavior declaration

### vision interpretation check

| vision statement | blueprint interpretation | adherent? |
|------------------|-------------------------|-----------|
| "get just the secret value (pipe friendly)" | `process.stdout.write(attempt.grant.key.secret)` — no newline | yes |
| "--output is the full format, --value is an alias" | `.option('--output <mode>')` + `.option('--value')` as alias | yes |
| "--json is an alias for --output json" | contracts table: `--json` boolean maps to json case | yes |
| "default is --output vibes" | switch case 'vibes' (default) | yes |
| "source outputs export statements" | `console.log(\`export \${keyName}=\${asShellEscapedSecret()}\`)` | yes |
| "--strict is default, fail if any not granted" | codepath: `strict mode (default)` + exit 2 | yes |
| "--lenient: skip absent keys silently" | codepath: `silently skip not granted (SDK parity)` | yes |
| "SDK parity: same modes, same semantics" | table maps SDK behavior to CLI behavior | yes |
| "exit 0 granted, exit 2 not granted" | codepath: `exit code logic (0 granted, 2 not granted)` | yes |

---

## deep analysis: what if the blueprint deviated?

### the alternative: what if blueprint used console.log for --value?

```
vision: "stdout has no final newline"
deviation: use console.log(secret) instead of process.stdout.write(secret)
```

this would violate the vision because:
- `console.log` appends `\n` automatically
- piped output would have extra whitespace at end
- users would need to `| tr -d '\n'` to strip it

**evidence blueprint is correct:**
blueprint specifies `process.stdout.write(attempt.grant.key.secret)` — explicit, no newline.

### the alternative: what if blueprint made lenient the default?

```
vision: "--strict is the default"
deviation: default to lenient, require --strict to fail on absent
```

this would violate the vision because:
- SDK uses strict as default (parity)
- fail-fast is safer for CI/CD
- users would not notice absent keys without explicit check

**evidence blueprint is correct:**
blueprint codepath shows `strict mode (default)` and contracts table shows `--strict | no | true (default)`.

### the alternative: what if blueprint allowed --value with --for repo?

```
vision: "--value only works with single key"
deviation: support --value + --for repo, output newline-separated values
```

this would violate the vision because:
- ambiguous order — which secret is which?
- no key names in output — impossible to distinguish
- vision explicitly states: "could support `--value` for `--for repo`... probably not useful"

**evidence blueprint is correct:**
blueprint codepath shows `validate: --value requires --key` — explicit rejection.

### the alternative: what if blueprint emitted warnings in lenient mode?

```
vision: "SDK lenient mode is silent"
deviation: emit "skipped KEY: not granted" to stderr
```

this would violate the vision because:
- SDK `sourceAllKeysIntoEnv` lenient mode is silent
- vision Q&A explicitly states: "no. SDK lenient mode is silent; CLI matches SDK"
- stderr noise pollutes logs when partial results are expected

**evidence blueprint is correct:**
blueprint codepath shows `silently skip not granted (SDK parity)` — explicit SDK parity note.

### the alternative: what if blueprint used different shell escape pattern?

```
vision: shell escape uses 'sec'\''ret' for quotes
deviation: use backslash escape: 'sec\'ret'
```

this would violate the vision because:
- `\'` does not work within single-quoted strings in bash
- only `'\''` properly closes, inserts literal quote, reopens
- vision shell escape table specifies exact pattern

**evidence blueprint is correct:**
blueprint shell escape rules table shows `'sec'\''ret'` — exact match to vision.

---

## criteria interpretation check

| criterion | blueprint interpretation | adherent? |
|-----------|-------------------------|-----------|
| usecase.1: stdout has no final newline | uses `process.stdout.write` not `console.log` | yes |
| usecase.2: exit 2 + stderr for not granted | codepath: `if status !== 'granted' → stderr + exit 2` | yes |
| usecase.3: --value requires --key | codepath: `validate: --value requires --key` | yes |
| usecase.5: export format `export KEY='secret'` | codepath shows exact format | yes |
| usecase.7: strict mode emits no stdout on failure | codepath: `no stdout (prevent partial eval)` | yes |
| usecase.8: lenient mode exit 0 even if none granted | implicitly covered — lenient always exit 0 | yes |
| usecase.10: single quote escaped as `'sec'\''ret'` | shell escape rules table | yes |
| usecase.10: newlines use `$'...'` syntax | shell escape rules table | yes |

---

## SDK parity verification

vision says CLI should match SDK:
- `keyrack.source({ mode: 'strict' })` ↔ `keyrack source --strict`
- `keyrack.source({ mode: 'lenient' })` ↔ `keyrack source --lenient`
- strict = default
- lenient skips silently

blueprint includes SDK parity table with exact map from SDK to CLI behavior.

**documented extension:**
> CLI extends SDK with `--key` filter (SDK has no key filter).

this is NOT a deviation — it's an approved extension. SDK `sourceAllKeysIntoEnv` has no key filter because it operates on the whole repo manifest. CLI adds `--key` for convenience. vision Q&A explicitly approved: "source --key X is CLI ergonomics extension beyond SDK."

---

## exit code verification

vision says: exit 0 for granted, exit 2 for not granted

blueprint specifies:
- contracts table: `exit 0 | granted`, `exit 2 | not granted`
- codepath tree: `exit code logic (0 granted, 2 not granted)`

**why exit 2 specifically?**
exit 2 = constraint error semantics (user must fix). distinct from exit 1 (malfunction). this aligns with keyrack brief `rule.require.exit-code-semantics.md` and enables automated retry decisions.

---

## issues found

none.

## why it holds

the blueprint correctly interprets every vision requirement:

1. **pipe-friendly output** — uses `process.stdout.write` not `console.log`, verified against alternative that would add newline

2. **strict as default** — verified against alternative that would make lenient default, SDK parity confirmed

3. **--value requires --key** — verified against alternative that would allow --for repo, correctly rejected

4. **silent lenient mode** — verified against alternative that would emit warnings, SDK parity confirmed

5. **shell escape pattern** — verified against alternative backslash escape, correct `'\''` pattern used

6. **SDK parity with documented extension** — `--key` filter is approved extension, not deviation

no deviations or misinterpretations detected. each key design decision was traced back to explicit vision or Q&A approval.
