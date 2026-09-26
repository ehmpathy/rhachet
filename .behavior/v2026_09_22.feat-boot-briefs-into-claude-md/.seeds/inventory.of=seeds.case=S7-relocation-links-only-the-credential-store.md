# S7 — relocation: link only the credential store

## .holds

- `.credentials.json` is the one link: `<actorDir>/brain/.claude/.credentials.json → ~/.claude/.credentials.json`, findserted.
- no other path is linked. a path earns a link by a measured failure.
- per-actor auth is an override: a real file in place of the link.
- measured: `CLAUDE_CONFIG_DIR=<empty dir> claude -p …` → exit 1, *"Not logged in"*.

## .supersedes

- a four-path link list (`.credentials.json`, `projects/`, `skills/`, `agents/`) — narrowed to the one proven path.

## .said

> we should symlink to default, by default
>
> dont include things that arent already needed to be symlinked explicitly. how can we prove or disprove
