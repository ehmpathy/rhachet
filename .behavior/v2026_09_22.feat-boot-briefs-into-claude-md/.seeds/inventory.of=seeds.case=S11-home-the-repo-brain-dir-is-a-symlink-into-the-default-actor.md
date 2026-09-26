# S11 — home: the repo's brain dir is a symlink into the default actor

## .holds

- every brain config lives under `.agent/.actors/`. the repo's is `actor.via.slug=.default/brain/.claude`.
- `<repo>/.claude` is a relative symlink to that dir.
- the default dir is the one tracked exclusion under `.actors/`, findserted into the repo `.gitignore`. its `boot.md` stays ignored.
- rhachet owns the whole boot context. an extant `.claude/AGENTS.md` or `.claude/CLAUDE.md` is not migrated: the render writes `AGENTS.md` itself, and a `CLAUDE.md` in the repo brain dir is not ours to keep.
- every other entry of an extant real `.claude/` moves into the default brain dir before the symlink replaces it.

## .said

> all the brain configs are in one spot
>
> that one dir as an exclusion
>
> findserted automatically into the repo .gitignore
>
> it should replace the repo's brain dir with a symlink

> we dont need to migrate extant .claude/AGENTS.md nor CLAUDE.md; we own the full boot context
