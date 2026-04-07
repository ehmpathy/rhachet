# self-review r9: has-behavior-declaration-coverage

## review for coverage of behavior declaration

### vision requirements vs blueprint coverage

| vision requirement | blueprint coverage | status |
|-------------------|-------------------|--------|
| `keyrack get --value` outputs raw secret | codepath: `case 'value': process.stdout.write(attempt.grant.key.secret)` | covered |
| `--value` requires `--key` | codepath: `validate: --value requires --key` | covered |
| no final newline on --value output | `process.stdout.write` not `console.log` | covered |
| exit 0 for granted, exit 2 for not granted | codepath: `exit code logic (0 granted, 2 not granted)` | covered |
| `--output <mode>` with value/json/vibes | codepath: `.option('--output <mode>')` + switch | covered |
| `--value` as alias for `--output value` | codepath: `.option('--value', 'alias for --output value')` | covered |
| `--json` as alias for `--output json` | contracts table: `--json` boolean, no false | covered |
| default output is vibes | codepath: `case 'vibes' (default)` | covered |
| `keyrack source` outputs export statements | codepath: `keyrack.command('source')` + emit loop | covered |
| `source` requires `--env` | codepath: `validate: --env required` | covered |
| `source` requires `--owner` | codepath: `validate: --owner required` | covered |
| `source --key X` for single key | codepath: `if opts.key → get single key` | covered |
| `source` (no --key) for all repo keys | codepath: `else → get all repo keys` | covered |
| `--strict` mode (default): fail if any not granted | codepath: `strict mode (default)` + exit 2 | covered |
| `--lenient` mode: skip absent silently | codepath: `lenient mode: silently skip` | covered |
| `--strict` and `--lenient` mutually exclusive | codepath: `validate: --strict and --lenient mutually exclusive` | covered |
| export format: `export KEY='secret'` | codepath: `console.log(\`export \${keyName}=\${asShellEscapedSecret()}\`)` | covered |
| shell escape single quotes | shell escape rules table: `'sec'\''ret'` | covered |
| shell escape newlines | shell escape rules table: `$'line1\nline2'` | covered |

---

### criteria usecases vs blueprint coverage

#### usecase.1 = get raw secret value for pipe use

| criterion | blueprint location | status |
|-----------|-------------------|--------|
| stdout contains raw secret value | codepath: `process.stdout.write(attempt.grant.key.secret)` | covered |
| stdout has no final newline | uses `process.stdout.write` not `console.log` | covered |
| exit code is 0 | codepath: exit code logic | covered |
| `--output value` identical to `--value` | both map to same switch case | covered |

#### usecase.2 = handle not granted states

| criterion | blueprint location | status |
|-----------|-------------------|--------|
| locked: exit 2, stderr shows status | codepath: `if status !== 'granted' → stderr + exit 2` | covered |
| absent: exit 2, stderr shows status | same codepath | covered |
| blocked: exit 2, stderr shows status | same codepath | covered |

#### usecase.3 = --value requires --key

| criterion | blueprint location | status |
|-----------|-------------------|--------|
| no --key: error, stderr | codepath: `validate: --value requires --key` | covered |
| --for repo with --value: error, stderr | same validation | covered |

#### usecase.4 = output mode selection

| criterion | blueprint location | status |
|-----------|-------------------|--------|
| --output json identical to --json | both map to same case | covered |
| --output vibes shows treestruct | codepath: `formatKeyrackGetOneOutput` | covered |
| default is vibes | switch default case | covered |

#### usecase.5 = source all repo keys

| criterion | blueprint location | status |
|-----------|-------------------|--------|
| export statements for each key | emit loop in codepath | covered |
| format `export KEY='secret'` | codepath shows format | covered |
| single quotes escaped | shell escape rules | covered |
| exit 0 | on success path | covered |

#### usecase.6 = source single key

| criterion | blueprint location | status |
|-----------|-------------------|--------|
| single export statement | `if opts.key → get single key` | covered |
| exit 0 | on success path | covered |

#### usecase.7 = strict mode (default)

| criterion | blueprint location | status |
|-----------|-------------------|--------|
| exit 2 if any not granted | codepath: `if any not granted → exit 2` | covered |
| stderr shows which keys not granted | codepath: `stderr` | covered |
| hint for --lenient | codepath: `hint` | covered |
| no stdout on failure | codepath: `no stdout (prevent partial eval)` | covered |

#### usecase.8 = lenient mode

| criterion | blueprint location | status |
|-----------|-------------------|--------|
| export only granted keys | codepath: `silently skip not granted` | covered |
| exit 0 | lenient mode success path | covered |
| empty if none granted | still exit 0 | covered |

#### usecase.9 = required inputs

| criterion | blueprint location | status |
|-----------|-------------------|--------|
| --env required | codepath: `validate: --env required` | covered |
| --owner required | codepath: `validate: --owner required` | covered |

#### usecase.10 = secrets with special characters

| criterion | blueprint location | status |
|-----------|-------------------|--------|
| single quote escaped | shell escape rules: `'sec'\''ret'` | covered |
| newlines preserved in --value | `process.stdout.write` preserves | covered |
| newlines escaped in source | shell escape rules: `$'...'` syntax | covered |

---

## issues found

none.

## why it holds

every vision requirement maps to a blueprint codepath or contract:
- `keyrack get --value` and `--output value` covered with switch case
- `keyrack source` covered with new subcommand + emit loop
- strict/lenient modes covered with validation and distinct codepaths
- shell escape rules covered with asShellEscapedSecret transformer
- all criteria usecases trace to specific blueprint locations

no requirements were omitted or left unaddressed.
