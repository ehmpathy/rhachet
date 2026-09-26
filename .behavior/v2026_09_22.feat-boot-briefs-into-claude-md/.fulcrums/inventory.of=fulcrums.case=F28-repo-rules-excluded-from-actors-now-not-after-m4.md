# F28 — repo rules are excluded from actors now, not after M4

## .fork

a `<repo>/.claude/rules/*.md` loads at launch with the priority of `.claude/CLAUDE.md`. an enrolled
clone runs with the repo as its cwd, so the rules may reach it past D5's list.

| option | |
|---|---|
| a. wait for M4 | add `<repo>/.claude/rules/**` only if journey [t3.1]'s R sentinel arrives |
| b. exclude now | `getClaudeMdExcludesList` returns both rules globs from the start |

## .verdict — TAKEN, 85%, rework clean

(b). the docs match `claudeMdExcludes` patterns as globs against absolute file paths, and show a
`…/.claude/rules/**` exclude (`code.claude.com/docs/en/memory`, 2026-09-23), so the glob branch
needs no new matcher. one brain dir per clone forbids repo context in an actor, and an exclude of a
file the cli would not load is inert. both path forms are listed, as D5 does for the pointer files,
since the repo's `.claude` is a symlink to the default brain dir.

## .why the confidence is not higher

a human may want repo-wide rules in every actor. that is a corpus decision this wish does not make;
the roles are where an actor's context comes from.

## .rework

clean: remove two entries from one transformer and one assertion from journey [t3.1].

## .where

- blueprint: D12 · the enroll codepath · `.by case` (`getClaudeMdExcludesList`) · M4 · journey [t3.1]
- review: i008 r011 blocker.1
