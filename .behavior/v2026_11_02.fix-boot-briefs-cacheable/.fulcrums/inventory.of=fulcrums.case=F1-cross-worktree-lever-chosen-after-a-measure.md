# F1 — the boot moves to the system prompt — the lever, chosen by measure

## .the fork
which change makes a fresh session read the boot from cache:
1. keep the `CLAUDE.md` door; strip every per-session and per-worktree value ahead of it (hook output,
   absolute paths, the cwd)
2. move the boot into the system prompt (`--system-prompt[-file]` / `--append-system-prompt-file`)
3. point claude at a config dir path that is equal across worktrees

## .taken, why
lever 2. the raw request (`rhx boot.cache.probe --diff`) shows claude places `cache_control` on the
system block and on the LAST block of the first message only. the `CLAUDE.md` boot sits between them,
ahead of the per-session prompt. levers 1 and 3 clean up bytes ahead of the boot, but the prompt after it
still differs per session, so no entry ever ends at the boot. measured: today a second session (different
prompt) wrote 125,844 and read 11,237; with the boot in the system prompt it wrote 4,779 and read 132,116.

## .rework
clean: the vision names the lever; the blueprint picks the flag form (open question 3).

## .confidence, why not higher
95%. measured on `-p` only; interactive mode shares the request shape but is not yet probed (open
question 4). breakpoint placement is a vendor detail with no contract.

## .where
`1.vision.yield.md` § the measure first, § why · `.log/role=any/skill=boot.cache.probe/20261102T022455Z/`
and `…/20261102T022529Z/`

## .verdict
settled by measure, 2026-11-02. replaces the earlier best guess (70%) that a per-worktree path label was the
cause; the raw request disproved it.
