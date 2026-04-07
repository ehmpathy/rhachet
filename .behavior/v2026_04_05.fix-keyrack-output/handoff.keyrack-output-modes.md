# handoff: keyrack output modes

## .what

keyrack CLI now supports multiple output modes for `get` and a new `source` command for shell integration.

## .commands

### keyrack get --output

```bash
# raw secret value (pipe-friendly, no final newline)
rhx keyrack get --key API_KEY --env test --value
rhx keyrack get --key API_KEY --env test --output value

# JSON structure (programmatic use)
rhx keyrack get --key API_KEY --env test --json
rhx keyrack get --key API_KEY --env test --output json

# vibes treestruct (default, human-readable)
rhx keyrack get --key API_KEY --env test
rhx keyrack get --key API_KEY --env test --output vibes
```

| mode | stdout | stderr | use case |
|------|--------|--------|----------|
| `value` | raw secret | vibes on failure | pipe to commands |
| `json` | JSON structure | errors | programmatic parse |
| `vibes` | turtle treestruct | — | human inspection |

### keyrack source

```bash
# source all repo keys into shell
eval "$(rhx keyrack source --env test --owner ehmpath)"

# source single key
eval "$(rhx keyrack source --key API_KEY --env test --owner ehmpath)"

# strict mode (default): fail if any key absent
eval "$(rhx keyrack source --env test --owner ehmpath --strict)"

# lenient mode: source what's available, skip absent
eval "$(rhx keyrack source --env test --owner ehmpath --lenient)"
```

## .exit codes

| code | means |
|------|-------|
| 0 | granted (or lenient mode success) |
| 2 | not granted (absent/locked/blocked) |

## .shell escape

secrets are escaped for safe shell eval:

| secret | escaped output |
|--------|----------------|
| `secret` | `'secret'` |
| `sec'ret` | `'sec'\''ret'` |
| `line1\nline2` | `$'line1\nline2'` |

## .examples

### pipe secret to command

```bash
# use secret as input
rhx keyrack get --key API_KEY --env test --value | some-command

# capture to variable
SECRET=$(rhx keyrack get --key API_KEY --env test --value)
```

### ci/cd setup

```bash
# strict: fail build if any credential absent
eval "$(rhx keyrack source --env prod --owner cicd --strict)"

# lenient: continue with available credentials
eval "$(rhx keyrack source --env test --owner dev --lenient)"
```

### debug

```bash
# see what's granted/absent
rhx keyrack get --key API_KEY --env test --json | jq .status

# human-readable status
rhx keyrack get --key API_KEY --env test
```

## .sdk parity

| sdk | cli |
|-----|-----|
| `keyrack.source({ mode: 'strict' })` | `keyrack source --strict` |
| `keyrack.source({ mode: 'lenient' })` | `keyrack source --lenient` |

cli extends sdk with `--key` filter (sdk sources all repo keys).

## .files changed

```
src/contract/cli/invokeKeyrack.ts           # --output option, source command
src/domain.operations/keyrack/cli/
  asShellEscapedSecret.ts                   # shell escape transformer
blackbox/cli/
  keyrack.get.output.acceptance.test.ts     # --value, --output mode tests
  keyrack.source.cli.acceptance.test.ts     # source command tests
```

## .test coverage

- `npm run test:acceptance:locally -- keyrack.get.output` — output mode tests
- `npm run test:acceptance:locally -- keyrack.source.cli` — source command tests
