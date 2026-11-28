# F8 · the clone's `claudeMdExcludes` are four globs over every brain dir door, own door included

## .the fork

- **a.** the extant literal list (repo doors, repo actor doors, the human's `~/.claude/CLAUDE.md`),
  plus the actor's own two doors as literals
- **b.** four globs: `**/.claude/AGENTS.md`, `**/.claude/CLAUDE.md`, `**/CLAUDE.local.md`,
  `**/.claude/rules/**`

## .taken = b

the vision opens the memory loads (the door switch goes, so the drift can load via `--add-dir`), so
the actor's own door must be excluded or the boot loads twice. once the own door is excluded, every
brain dir door is one a clone should not read, so the reason the list held literals (a glob for the
home door would also hit the clone's own door) is gone. the globs also drop every host path from the
repo actor's tracked `settings.of.repo.json`: a literal own door there would carry each worktree's
absolute path, and the file already carried `/home/<user>/.claude/CLAUDE.md`. the boot revision's
`CLAUDE.md` sits outside every `.claude` dir, so no glob hides the drift.

## .rework = clean

one file (`getClaudeMdExcludesList`), one caller, one unit test, one integration test; a literal list
is a one-file revert.

## .confidence = 80%, why not higher

the docs say claude globs each pattern against absolute paths, and `**/CLAUDE.local.md` already
works in the field, but whether a user-source door (`CLAUDE_CONFIG_DIR/CLAUDE.md`) obeys
`claudeMdExcludes` is not documented. the keystone probe (step 1) measures it: the boot sentinel
must arrive once, in the system block, never again in the messages.

## .where

`src/domain.operations/enroll/getClaudeMdExcludesList.ts`

## .verdict

owed, from the wisher at execution review.
