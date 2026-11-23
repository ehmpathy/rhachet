# F3 — a grove the old build already wrote into: warn, or leave out of scope

## .the fork
a box with a writable grove ran the old build; its `~/.claude/settings.json` holds this repo's role
hooks. the new init never touches the file. so:
- A: out of scope. the wish names no cleanup; the stale hooks stay silent
- B: init reads the grove and prints a read-only `⚠️` that names the stale hooks and the file

## .taken
A for now, with B sketched in case=6. the wish's scope is "never write outside the repo" and
"print every error"; a stale-hook scan is a new read of the home dir the wish did not ask for.

## .rework
clean — B is one read and one warn block, added beside the actor pass.

## .confidence
60%. the harm in case=6 is real (hooks fire box-wide) and the wisher may want it closed in the
same release, since the same humans who hit the bug are the ones polluted.

## .where
`1.vision.yield.md` .open questions · `case=6`.
