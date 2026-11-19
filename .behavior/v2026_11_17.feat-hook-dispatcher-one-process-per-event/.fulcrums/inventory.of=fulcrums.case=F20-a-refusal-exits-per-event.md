# F20 — the dispatcher's own refusal picks its exit code per event

## .the fork

the dispatcher refuses when its manifest is absent, of another version, or malformed, or when it
cannot create its per-call files. exit 2 fails closed on PreToolUse. on two events, exit 2 does
harm a seat cannot undo:

- **UserPromptSubmit**: exit 2 erases the prompt the human typed
- **Stop**: exit 2 holds the stop. the fix (`npx rhx init --hooks`) is a Bash call that the same
  dispatcher refuses, so the seat loops until a human steps in

options:

- **(a)** exit 2 on every event: uniform, and loops on Stop
- **(b)** exit 1 on UserPromptSubmit, and exit 1 on a Stop whose payload says
  `stop_hook_active: true`; exit 2 on every other refusal
- **(c)** exit 1 on every non-tool event

## .taken

(b). each event keeps the strongest refusal it can bear:

- PreToolUse and SessionStart stay at exit 2, so a guard that cannot load never allows a tool
- UserPromptSubmit exits 1: the human sees the refusal text, and the prompt survives
- the first Stop still holds (exit 2), so the seat reads the fix. a Stop already held once
  (`stop_hook_active: true`) exits 1, so a seat that cannot run the fix can still stop

(c) would drop the first Stop's hold. that hold is the one moment the seat reads the fix.

## .rework

clean: one `__rhx_dispatch_refuse` assignment block near the top of `bin/hooks.dispatch.sh`.

## .confidence

85%. claude documents `stop_hook_active`; the loop it guards against was reasoned from the
review, not observed on a live seat.

## .where

`bin/hooks.dispatch.sh` (`__rhx_dispatch_refuse`); pinned by `[t7b]` in
`blackbox/cli/hooks.dispatch.acceptance.test.ts`.

## .verdict

open, for the director at the pr.
