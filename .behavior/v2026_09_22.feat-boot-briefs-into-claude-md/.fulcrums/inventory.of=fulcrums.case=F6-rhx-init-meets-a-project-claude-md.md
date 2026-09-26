# F6 — `rhx init` meets a project `CLAUDE.md`

## .fork

a project `CLAUDE.md` (or `CLAUDE.local.md`) switches off the `agents-md` walk, so the repo brain
dir's `AGENTS.md` stops to load for an unenrolled `claude` (`3.1.1` E5).

| option | |
|---|---|
| a. refuse | `init` halts and names the shadow |
| b. warn | `init` writes and prints the fix |
| c. edit the human's file | append an import to a file we do not own |
| d. set the plugin override | reaches `--settings` and user scope only — never a bare `claude` |

## .verdict — SUPERSEDED by the vision's `.accepted`

no guard. the unenrolled path is best-effort: the remote flag gate and a human's own `CLAUDE.md`
both can switch it off, silently, and a human's file is theirs.

## .grounds

- the enrolled path does not depend on the walk: its corpus loads through the actor dir's
  `CLAUDE.md` link, engine-native (F7), and D5 excludes the repo brain dir outright.
- (c) writes into an artifact we do not own; (a) and (b) guard one population on a path already
  accepted as best-effort.

## .successor

blueprint **Q2** — a `<repo>/.claude/CLAUDE.md` → `AGENTS.md` symlink would make the unenrolled
path engine-native. the dogfood of 2026-09-23 measured `AGENTS.md` alone failed to load.

## .where

- vision `.accepted` · criteria usecase.4 · blueprint Q2 · `refs/howto.dogfood-brain-dir-boot.md`
