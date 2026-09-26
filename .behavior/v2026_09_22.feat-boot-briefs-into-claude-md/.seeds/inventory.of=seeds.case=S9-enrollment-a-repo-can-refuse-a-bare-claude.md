# S9 — enrollment: a repo can refuse a bare `claude`

## .holds

- a repo must be able to refuse a bare `claude` — a requirement.
- its enforcement (a `PATH` shim or a `PreToolUse` brick) is a dream, owed after this lands.
- meanwhile a bare `claude` boots from the repo's brain dir (S3).

## .said

> enable repos to force `rhx enroll` usage, that way we dont have a landmine where we can get unenrolled clones. lets make that a hard requirement
>
> yeah ok lets just add the rhx enroll mandate as a separate dream, that we'll do after this work, since it alone is a bit complicated
