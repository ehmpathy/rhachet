# F22 — the repo's brain dir is a symlink into the default actor

## .verdict — RULED by the wisher, 2026-09-23 (S11)

`<repo>/.claude` is a relative symlink to `.agent/.actors/actor.via.slug=.default/brain/.claude`. every brain config lives under `.actors/`; the default dir is the one tracked exclusion, findserted into the repo `.gitignore`.

## .the fork

| option | cost |
|---|---|
| a real `<repo>/.claude/`, as today | brain configs in two places; the repo's is the odd one out |
| **the whole dir as a symlink** — taken | one migration of an extant `.claude/`; git and the cli must follow the link |
| a per-file symlink (`AGENTS.md` alone) | two homes for one brain dir's files |

## .rework — dirty

once `init` has migrated a fleet's `.claude/` dirs, a reversal is a second migration in every repo.

## .measured (M5, cli 2.1.87)

project `settings.json` hooks, `.claude/CLAUDE.md`, and the `agents-md` walk's `.claude/AGENTS.md` all load through the link. a `CLAUDE.md` exclude matches the symlink path; an `AGENTS.md` exclude on the symlink path does not — so D5 lists both spellings.

## .where

D10 · D5 · `setRepoBrainDirSymlink` · vision `.the shape` · criteria usecase.3
