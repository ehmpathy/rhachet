# F3 — an "always allow" grant lands in settings.of.repo.json, accepted

## .the fork
- A: accept it — the grant is the repo's, and it shows as a diff on a tracked file
- B: have a role init re-derive the allowlist and drop strays

## .taken = A, and why
B is a role's concern (the mechanic init already rewrites its allowlist), not the layout op's. A ships the
wish's core fix with no new behavior beyond one arrow, and the grant is never silent: it lands in a
tracked file a reviewer reads.

## .rework = clean
B lives in a role package and needs no change here.

## .confidence = 80%, low because
a grant a human meant as personal may land in a commit if the reviewer does not read the diff.

## .where
claude's own write path through `settings.local.json`

## .verdict
ruled 2026-10-15 by the wisher: A, confirmed — `settings.of.repo.json` is exactly where an "always allow" should land (seed S1).

superseded 2026-10-15 by the wisher (seed S4): an "always allow" never reaches `settings.of.repo.json`;
a repo change is an explicit opt-in. claude refuses the write through the symlinked `<repo>/.claude`,
so the grant lasts the session only — criterion (5) of `define.invariant.brain-config-grove-vs-repo`.
