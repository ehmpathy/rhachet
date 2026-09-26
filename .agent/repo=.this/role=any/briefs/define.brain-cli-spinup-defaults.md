# define.brain-cli-spinup-defaults

## .what

every clone spawns claude with these switches set, unless the caller already set the key:

| key | value | skips |
|---|---|---|
| `ENABLE_CLAUDEAI_MCP_SERVERS` | `false` | the claude.ai connector fetch at launch |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | `1` | non-essential network calls |
| `DISABLE_AUTOUPDATER` | `1` | the update check |
| `DISABLE_TELEMETRY` | `1` | telemetry |
| `DISABLE_ERROR_REPORTING` | `1` | error reports |

one owner: `BRAIN_CLI_SPINUP_ENV_DEFAULTS` in `asBrainCliSpawnEnv`, which both spawn sites use.

## .why

- a clone never uses a claude.ai connector, an update, or telemetry. each one is network work at
  launch.
- measured 2026-09-24 on a clean HOME with `claude -p --model haiku`: connectors plus non-essential
  traffic took the average from ~21s to ~14s.
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` counts as set for any non-empty value, `0` included.

## .what is NOT used, and why

| lever | why not |
|---|---|
| `--bare` | it skips `CLAUDE.md`, hooks, plugins, and OAuth. a clone needs its boot corpus and its credential |
| the `env` block in the actor's `settings.json` | a second owner of the list. the spawn env already reaches every clone |

## .how to measure a new lever

time a bare `claude -p` in an isolated HOME, once per env variant, several runs each. a single run on
a loaded box varies by ±10s, so compare averages, never one sample.

## .see also

- `rule.require.thinnest-import-path` — the rhachet half of the launch cost
- `define.brain-dir-repo-vs-actor` — which config dir a clone reads
