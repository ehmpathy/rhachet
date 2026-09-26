# F12 — `--exclude-dynamic-system-prompt-sections`: now or later

## .fork

the prompt cache is scoped per machine and directory — worktrees included (`3.1.1` E16). the flag
moves cwd, platform, shell and OS version out of the system prompt, so the prefix matches across
worktrees.

| option | verdict |
|---|---|
| **a. add it on every spawn, with the transport** | ✅ **taken** |
| b. defer it to its own round | ❌ it is a vision guardrail |

## .verdict — TAKEN: blueprint D6

## .grounds

- the vision lists it under `.guardrails`: *"many worktrees → `--exclude-dynamic-system-prompt-sections`
  on every spawn."* a guardrail the vision ruled is not a driver's to defer.
- the cost is one entry in `asBrainCliSpawnArgs` and the update the exact-array clamp exists to force.
- whether the file earns a cache read at all is measurement M2; the flag is owed either way.

## .where

- blueprint D6, `asBrainCliSpawnArgs` · vision `.guardrails`
