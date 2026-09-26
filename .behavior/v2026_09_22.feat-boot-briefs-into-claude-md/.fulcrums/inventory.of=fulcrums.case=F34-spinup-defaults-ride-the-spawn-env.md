# F34 — the spin-up defaults ride the spawn env

## .fork

S12 asks every actor to skip claude.ai connectors, non-essential traffic, the autoupdater,
telemetry, and error reports by default. the question is where to set them.

| option | |
|---|---|
| a. `asBrainCliSpawnEnv`, beneath the caller's env | one seam that both spawn sites (pty and plain) already share. a human who sets a key keeps their value |
| b. the `env` block of the actor's `settings.json` | lives with the actor's config, but it adds a render step and a key the human cannot override per call |
| c. both | two owners of one list, and they can drift |
| d. `--bare` | fastest, but it skips `CLAUDE.md`, hooks, and OAuth — the boot corpus and the credential |

## .verdict — TAKEN, 85%, rework clean

(a). measured on a clean HOME, the connector and traffic switches cut `claude -p` from ~21s to
~14s through the process env, so the env path is known to work. the journey's bare `claude -p` helper
takes the same constant, since it does not change which memory files load.

## .why the confidence is not higher

(b) would also cover a human who runs plain `claude` with `CLAUDE_CONFIG_DIR` pointed at an actor
dir by hand. that is not a supported path, so it stays out of scope.

## .rework

clean: one constant and one spread.

## .where

- `src/domain.operations/enroll/asBrainCliSpawnEnv.ts` · its unit test `[case3]`, `[case4]`
- `blackbox/.test/infra/brainDirBootJourney.ts` `askClaudePrintForSentinels`
