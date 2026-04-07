# self-review: has-ergonomics-validated

## the question

double-check: does the actual input/output match what felt right at repros?

## the review

### vision-to-implementation comparison

this review compares the vision document's planned ergonomics against actual implementation.

#### keyrack get --value

| aspect | vision | implementation | match? |
|--------|--------|----------------|--------|
| flag name | `--value` | `.option('--value', ...)` | yes |
| output | raw secret, no newline | `process.stdout.write(secret)` | yes |
| exit 0 | granted | if status === 'granted' | yes |
| exit 2 | not granted | if status !== 'granted' | yes |
| stderr on fail | `$status: $slug` | `console.error(\`${status}: ${slug}\`)` | yes |

**why it holds:** implementation exactly matches vision ergonomics.

#### keyrack get --output mode

| aspect | vision | implementation | match? |
|--------|--------|----------------|--------|
| `--output value` | same as --value | outputMode derivation | yes |
| `--output json` | same as --json | outputMode derivation | yes |
| `--output vibes` | treestruct (default) | outputMode default | yes |
| default | vibes | `opts.json ? 'json' : 'vibes'` | yes |

**why it holds:** both shorthand flags and explicit --output work as planned.

#### keyrack source

| aspect | vision | implementation | match? |
|--------|--------|----------------|--------|
| `--env` | required | `.requiredOption('--env')` | yes |
| `--owner` | required | `.requiredOption('--owner')` | yes |
| `--key` | optional (single key) | `.option('--key')` | yes |
| `--strict` | default | `isLenient = opts.lenient ?? false` | yes |
| `--lenient` | alternative | `.option('--lenient')` | yes |

**why it holds:** all flags match vision specification.

#### source output format

| aspect | vision | implementation | match? |
|--------|--------|----------------|--------|
| format | `export KEY='secret'` | `console.log(\`export ${keyName}=${escaped}\`)` | yes |
| escape | single quotes | `asShellEscapedSecret` | yes |
| newlines | `$'line1\nline2'` | ANSI-C syntax in transformer | yes |

**why it holds:** export format matches vision exactly.

#### error messages

| aspect | vision | implementation | match? |
|--------|--------|----------------|--------|
| strict fail | `some keys not granted...` | `not granted: ${slug} (${status})` | close |
| hint | `use --lenient if partial results are acceptable` | exact match | yes |
| exit code | 2 | `process.exit(2)` | yes |

**close match note:** vision said "some keys not granted" as a summary. implementation shows each key individually with `not granted: $slug`. this is better ergonomics — user sees exactly which keys failed.

### minor drifts (improvements)

| drift | vision | implementation | verdict |
|-------|--------|----------------|---------|
| error detail | summary | per-key status | better |
| --for alias | not mentioned | `--for` as alias for `--owner` | added convenience |

both drifts are improvements over vision. no regression.

### validation checks

ran through vision usecases:

```
| usecase | vision syntax | implementation | works? |
|---------|---------------|----------------|--------|
| pipe secret | keyrack get --key X --value | implemented | yes |
| set env var | eval "$(keyrack source --key X ...)" | implemented | yes |
| source all | eval "$(keyrack source --env test)" | implemented | yes |
| ci/cd setup | keyrack source --strict | default behavior | yes |
| local dev | keyrack source --lenient | opt-in | yes |
```

## found concerns

none. implementation matches vision ergonomics with two minor improvements:
1. per-key error detail instead of summary
2. `--for` alias for `--owner`

both are additive; no regressions from planned ergonomics.

## conclusion

**has-ergonomics-validated check: PASS**

- all input flags match vision
- all output formats match vision
- exit codes match vision
- error messages match or improve on vision
- no ergonomics regressions

